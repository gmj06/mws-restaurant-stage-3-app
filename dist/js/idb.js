'use strict';

(function () {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function (resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });
    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function (value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function (prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function () {
          return this[targetProp][prop];
        },
        set: function (val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;

      ProxyClass.prototype[prop] = function () {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;

      ProxyClass.prototype[prop] = function () {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;

      ProxyClass.prototype[prop] = function () {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', ['name', 'keyPath', 'multiEntry', 'unique']);
  proxyRequestMethods(Index, '_index', IDBIndex, ['get', 'getKey', 'getAll', 'getAllKeys', 'count']);
  proxyCursorRequestMethods(Index, '_index', IDBIndex, ['openCursor', 'openKeyCursor']);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', ['direction', 'key', 'primaryKey', 'value']);
  proxyRequestMethods(Cursor, '_cursor', IDBCursor, ['update', 'delete']); // proxy 'next' methods

  ['advance', 'continue', 'continuePrimaryKey'].forEach(function (methodName) {
    if (!(methodName in IDBCursor.prototype)) return;

    Cursor.prototype[methodName] = function () {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function () {
        cursor._cursor[methodName].apply(cursor._cursor, args);

        return promisifyRequest(cursor._request).then(function (value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function () {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function () {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', ['name', 'keyPath', 'indexNames', 'autoIncrement']);
  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, ['put', 'add', 'delete', 'clear', 'get', 'getAll', 'getKey', 'getAllKeys', 'count']);
  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, ['openCursor', 'openKeyCursor']);
  proxyMethods(ObjectStore, '_store', IDBObjectStore, ['deleteIndex']);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function (resolve, reject) {
      idbTransaction.oncomplete = function () {
        resolve();
      };

      idbTransaction.onerror = function () {
        reject(idbTransaction.error);
      };

      idbTransaction.onabort = function () {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function () {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', ['objectStoreNames', 'mode']);
  proxyMethods(Transaction, '_tx', IDBTransaction, ['abort']);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function () {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', ['name', 'version', 'objectStoreNames']);
  proxyMethods(UpgradeDB, '_db', IDBDatabase, ['deleteObjectStore', 'close']);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function () {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', ['name', 'version', 'objectStoreNames']);
  proxyMethods(DB, '_db', IDBDatabase, ['close']); // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises

  ['openCursor', 'openKeyCursor'].forEach(function (funcName) {
    [ObjectStore, Index].forEach(function (Constructor) {
      // Don't create iterateKeyCursor if openKeyCursor doesn't exist.
      if (!(funcName in Constructor.prototype)) return;

      Constructor.prototype[funcName.replace('open', 'iterate')] = function () {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));

        request.onsuccess = function () {
          callback(request.result);
        };
      };
    });
  }); // polyfill getAll

  [Index, ObjectStore].forEach(function (Constructor) {
    if (Constructor.prototype.getAll) return;

    Constructor.prototype.getAll = function (query, count) {
      var instance = this;
      var items = [];
      return new Promise(function (resolve) {
        instance.iterateCursor(query, function (cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }

          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }

          cursor.continue();
        });
      });
    };
  });
  var exp = {
    open: function (name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      if (request) {
        request.onupgradeneeded = function (event) {
          if (upgradeCallback) {
            upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
          }
        };
      }

      return p.then(function (db) {
        return new DB(db);
      });
    },
    delete: function (name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  } else {
    self.idb = exp;
  }
})();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlkYi5qcyJdLCJuYW1lcyI6WyJ0b0FycmF5IiwiYXJyIiwiQXJyYXkiLCJwcm90b3R5cGUiLCJzbGljZSIsImNhbGwiLCJwcm9taXNpZnlSZXF1ZXN0IiwicmVxdWVzdCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwib25zdWNjZXNzIiwicmVzdWx0Iiwib25lcnJvciIsImVycm9yIiwicHJvbWlzaWZ5UmVxdWVzdENhbGwiLCJvYmoiLCJtZXRob2QiLCJhcmdzIiwicCIsImFwcGx5IiwidGhlbiIsInByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsIiwidmFsdWUiLCJDdXJzb3IiLCJwcm94eVByb3BlcnRpZXMiLCJQcm94eUNsYXNzIiwidGFyZ2V0UHJvcCIsInByb3BlcnRpZXMiLCJmb3JFYWNoIiwicHJvcCIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZ2V0Iiwic2V0IiwidmFsIiwicHJveHlSZXF1ZXN0TWV0aG9kcyIsIkNvbnN0cnVjdG9yIiwiYXJndW1lbnRzIiwicHJveHlNZXRob2RzIiwicHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyIsIkluZGV4IiwiaW5kZXgiLCJfaW5kZXgiLCJJREJJbmRleCIsImN1cnNvciIsIl9jdXJzb3IiLCJfcmVxdWVzdCIsIklEQkN1cnNvciIsIm1ldGhvZE5hbWUiLCJPYmplY3RTdG9yZSIsInN0b3JlIiwiX3N0b3JlIiwiY3JlYXRlSW5kZXgiLCJJREJPYmplY3RTdG9yZSIsIlRyYW5zYWN0aW9uIiwiaWRiVHJhbnNhY3Rpb24iLCJfdHgiLCJjb21wbGV0ZSIsIm9uY29tcGxldGUiLCJvbmFib3J0Iiwib2JqZWN0U3RvcmUiLCJJREJUcmFuc2FjdGlvbiIsIlVwZ3JhZGVEQiIsImRiIiwib2xkVmVyc2lvbiIsInRyYW5zYWN0aW9uIiwiX2RiIiwiY3JlYXRlT2JqZWN0U3RvcmUiLCJJREJEYXRhYmFzZSIsIkRCIiwiZnVuY05hbWUiLCJyZXBsYWNlIiwiY2FsbGJhY2siLCJsZW5ndGgiLCJuYXRpdmVPYmplY3QiLCJnZXRBbGwiLCJxdWVyeSIsImNvdW50IiwiaW5zdGFuY2UiLCJpdGVtcyIsIml0ZXJhdGVDdXJzb3IiLCJwdXNoIiwidW5kZWZpbmVkIiwiY29udGludWUiLCJleHAiLCJvcGVuIiwibmFtZSIsInZlcnNpb24iLCJ1cGdyYWRlQ2FsbGJhY2siLCJpbmRleGVkREIiLCJvbnVwZ3JhZGVuZWVkZWQiLCJldmVudCIsImRlbGV0ZSIsIm1vZHVsZSIsImV4cG9ydHMiLCJkZWZhdWx0Iiwic2VsZiIsImlkYiJdLCJtYXBwaW5ncyI6IkFBQUE7O0FBRUMsYUFBVztBQUNWLFdBQVNBLE9BQVQsQ0FBaUJDLEdBQWpCLEVBQXNCO0FBQ3BCLFdBQU9DLEtBQUssQ0FBQ0MsU0FBTixDQUFnQkMsS0FBaEIsQ0FBc0JDLElBQXRCLENBQTJCSixHQUEzQixDQUFQO0FBQ0Q7O0FBRUQsV0FBU0ssZ0JBQVQsQ0FBMEJDLE9BQTFCLEVBQW1DO0FBQ2pDLFdBQU8sSUFBSUMsT0FBSixDQUFZLFVBQVNDLE9BQVQsRUFBa0JDLE1BQWxCLEVBQTBCO0FBQzNDSCxNQUFBQSxPQUFPLENBQUNJLFNBQVIsR0FBb0IsWUFBVztBQUM3QkYsUUFBQUEsT0FBTyxDQUFDRixPQUFPLENBQUNLLE1BQVQsQ0FBUDtBQUNELE9BRkQ7O0FBSUFMLE1BQUFBLE9BQU8sQ0FBQ00sT0FBUixHQUFrQixZQUFXO0FBQzNCSCxRQUFBQSxNQUFNLENBQUNILE9BQU8sQ0FBQ08sS0FBVCxDQUFOO0FBQ0QsT0FGRDtBQUdELEtBUk0sQ0FBUDtBQVNEOztBQUVELFdBQVNDLG9CQUFULENBQThCQyxHQUE5QixFQUFtQ0MsTUFBbkMsRUFBMkNDLElBQTNDLEVBQWlEO0FBQy9DLFFBQUlYLE9BQUo7QUFDQSxRQUFJWSxDQUFDLEdBQUcsSUFBSVgsT0FBSixDQUFZLFVBQVNDLE9BQVQsRUFBa0JDLE1BQWxCLEVBQTBCO0FBQzVDSCxNQUFBQSxPQUFPLEdBQUdTLEdBQUcsQ0FBQ0MsTUFBRCxDQUFILENBQVlHLEtBQVosQ0FBa0JKLEdBQWxCLEVB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QUNDLEdBQUwsR0FBV2IsR0FBWDtBQUNEO0FBQ0YsQ0F6VEEsR0FBRCIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuKGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiB0b0FycmF5KGFycikge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIpO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5UmVxdWVzdChyZXF1ZXN0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICB9O1xuXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlcXVlc3QuZXJyb3IpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeVJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKSB7XG4gICAgdmFyIHJlcXVlc3Q7XG4gICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlcXVlc3QgPSBvYmpbbWV0aG9kXS5hcHBseShvYmosIGFyZ3MpO1xuICAgICAgcHJvbWlzaWZ5UmVxdWVzdChyZXF1ZXN0KS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfSk7XG5cbiAgICBwLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIHJldHVybiBwO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5Q3Vyc29yUmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpIHtcbiAgICB2YXIgcCA9IHByb21pc2lmeVJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKTtcbiAgICByZXR1cm4gcC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoIXZhbHVlKSByZXR1cm47XG4gICAgICByZXR1cm4gbmV3IEN1cnNvcih2YWx1ZSwgcC5yZXF1ZXN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5UHJvcGVydGllcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShQcm94eUNsYXNzLnByb3RvdHlwZSwgcHJvcCwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzW3RhcmdldFByb3BdW3Byb3BdO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlSZXF1ZXN0TWV0aG9kcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBDb25zdHJ1Y3RvciwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBpZiAoIShwcm9wIGluIENvbnN0cnVjdG9yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICAgIFByb3h5Q2xhc3MucHJvdG90eXBlW3Byb3BdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0Q2FsbCh0aGlzW3RhcmdldFByb3BdLCBwcm9wLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5TWV0aG9kcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBDb25zdHJ1Y3RvciwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBpZiAoIShwcm9wIGluIENvbnN0cnVjdG9yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICAgIFByb3h5Q2xhc3MucHJvdG90eXBlW3Byb3BdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzW3RhcmdldFByb3BdW3Byb3BdLmFwcGx5KHRoaXNbdGFyZ2V0UHJvcF0sIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBDb25zdHJ1Y3RvciwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBpZiAoIShwcm9wIGluIENvbnN0cnVjdG9yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICAgIFByb3h5Q2xhc3MucHJvdG90eXBlW3Byb3BdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlDdXJzb3JSZXF1ZXN0Q2FsbCh0aGlzW3RhcmdldFByb3BdLCBwcm9wLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIEluZGV4KGluZGV4KSB7XG4gICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgfVxuXG4gIHByb3h5UHJvcGVydGllcyhJbmRleCwgJ19pbmRleCcsIFtcbiAgICAnbmFtZScsXG4gICAgJ2tleVBhdGgnLFxuICAgICdtdWx0aUVudHJ5JyxcbiAgICAndW5pcXVlJ1xuICBdKTtcblxuICBwcm94eVJlcXVlc3RNZXRob2RzKEluZGV4LCAnX2luZGV4JywgSURCSW5kZXgsIFtcbiAgICAnZ2V0JyxcbiAgICAnZ2V0S2V5JyxcbiAgICAnZ2V0QWxsJyxcbiAgICAnZ2V0QWxsS2V5cycsXG4gICAgJ2NvdW50J1xuICBdKTtcblxuICBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKEluZGV4LCAnX2luZGV4JywgSURCSW5kZXgsIFtcbiAgICAnb3BlbkN1cnNvcicsXG4gICAgJ29wZW5LZXlDdXJzb3InXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIEN1cnNvcihjdXJzb3IsIHJlcXVlc3QpIHtcbiAgICB0aGlzLl9jdXJzb3IgPSBjdXJzb3I7XG4gICAgdGhpcy5fcmVxdWVzdCA9IHJlcXVlc3Q7XG4gIH1cblxuICBwcm94eVByb3BlcnRpZXMoQ3Vyc29yLCAnX2N1cnNvcicsIFtcbiAgICAnZGlyZWN0aW9uJyxcbiAgICAna2V5JyxcbiAgICAncHJpbWFyeUtleScsXG4gICAgJ3ZhbHVlJ1xuICBdKTtcblxuICBwcm94eVJlcXVlc3RNZXRob2RzKEN1cnNvciwgJ19jdXJzb3InLCBJREJDdXJzb3IsIFtcbiAgICAndXBkYXRlJyxcbiAgICAnZGVsZXRlJ1xuICBdKTtcblxuICAvLyBwcm94eSAnbmV4dCcgbWV0aG9kc1xuICBbJ2FkdmFuY2UnLCAnY29udGludWUnLCAnY29udGludWVQcmltYXJ5S2V5J10uZm9yRWFjaChmdW5jdGlvbihtZXRob2ROYW1lKSB7XG4gICAgaWYgKCEobWV0aG9kTmFtZSBpbiBJREJDdXJzb3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgIEN1cnNvci5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJzb3IgPSB0aGlzO1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgY3Vyc29yLl9jdXJzb3JbbWV0aG9kTmFtZV0uYXBwbHkoY3Vyc29yLl9jdXJzb3IsIGFyZ3MpO1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdChjdXJzb3IuX3JlcXVlc3QpLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm47XG4gICAgICAgICAgcmV0dXJuIG5ldyBDdXJzb3IodmFsdWUsIGN1cnNvci5fcmVxdWVzdCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gT2JqZWN0U3RvcmUoc3RvcmUpIHtcbiAgICB0aGlzLl9zdG9yZSA9IHN0b3JlO1xuICB9XG5cbiAgT2JqZWN0U3RvcmUucHJvdG90eXBlLmNyZWF0ZUluZGV4ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBJbmRleCh0aGlzLl9zdG9yZS5jcmVhdGVJbmRleC5hcHBseSh0aGlzLl9zdG9yZSwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgT2JqZWN0U3RvcmUucHJvdG90eXBlLmluZGV4ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBJbmRleCh0aGlzLl9zdG9yZS5pbmRleC5hcHBseSh0aGlzLl9zdG9yZSwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgW1xuICAgICduYW1lJyxcbiAgICAna2V5UGF0aCcsXG4gICAgJ2luZGV4TmFtZXMnLFxuICAgICdhdXRvSW5jcmVtZW50J1xuICBdKTtcblxuICBwcm94eVJlcXVlc3RNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAncHV0JyxcbiAgICAnYWRkJyxcbiAgICAnZGVsZXRlJyxcbiAgICAnY2xlYXInLFxuICAgICdnZXQnLFxuICAgICdnZXRBbGwnLFxuICAgICdnZXRLZXknLFxuICAgICdnZXRBbGxLZXlzJyxcbiAgICAnY291bnQnXG4gIF0pO1xuXG4gIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdvcGVuQ3Vyc29yJyxcbiAgICAnb3BlbktleUN1cnNvcidcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAnZGVsZXRlSW5kZXgnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIFRyYW5zYWN0aW9uKGlkYlRyYW5zYWN0aW9uKSB7XG4gICAgdGhpcy5fdHggPSBpZGJUcmFuc2FjdGlvbjtcbiAgICB0aGlzLmNvbXBsZXRlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH07XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChpZGJUcmFuc2FjdGlvbi5lcnJvcik7XG4gICAgICB9O1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25hYm9ydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QoaWRiVHJhbnNhY3Rpb24uZXJyb3IpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIFRyYW5zYWN0aW9uLnByb3RvdHlwZS5vYmplY3RTdG9yZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgT2JqZWN0U3RvcmUodGhpcy5fdHgub2JqZWN0U3RvcmUuYXBwbHkodGhpcy5fdHgsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhUcmFuc2FjdGlvbiwgJ190eCcsIFtcbiAgICAnb2JqZWN0U3RvcmVOYW1lcycsXG4gICAgJ21vZGUnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhUcmFuc2FjdGlvbiwgJ190eCcsIElEQlRyYW5zYWN0aW9uLCBbXG4gICAgJ2Fib3J0J1xuICBdKTtcblxuICBmdW5jdGlvbiBVcGdyYWRlREIoZGIsIG9sZFZlcnNpb24sIHRyYW5zYWN0aW9uKSB7XG4gICAgdGhpcy5fZGIgPSBkYjtcbiAgICB0aGlzLm9sZFZlcnNpb24gPSBvbGRWZXJzaW9uO1xuICAgIHRoaXMudHJhbnNhY3Rpb24gPSBuZXcgVHJhbnNhY3Rpb24odHJhbnNhY3Rpb24pO1xuICB9XG5cbiAgVXBncmFkZURCLnByb3RvdHlwZS5jcmVhdGVPYmplY3RTdG9yZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgT2JqZWN0U3RvcmUodGhpcy5fZGIuY3JlYXRlT2JqZWN0U3RvcmUuYXBwbHkodGhpcy5fZGIsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhVcGdyYWRlREIsICdfZGInLCBbXG4gICAgJ25hbWUnLFxuICAgICd2ZXJzaW9uJyxcbiAgICAnb2JqZWN0U3RvcmVOYW1lcydcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKFVwZ3JhZGVEQiwgJ19kYicsIElEQkRhdGFiYXNlLCBbXG4gICAgJ2RlbGV0ZU9iamVjdFN0b3JlJyxcbiAgICAnY2xvc2UnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIERCKGRiKSB7XG4gICAgdGhpcy5fZGIgPSBkYjtcbiAgfVxuXG4gIERCLnByb3RvdHlwZS50cmFuc2FjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgVHJhbnNhY3Rpb24odGhpcy5fZGIudHJhbnNhY3Rpb24uYXBwbHkodGhpcy5fZGIsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhEQiwgJ19kYicsIFtcbiAgICAnbmFtZScsXG4gICAgJ3ZlcnNpb24nLFxuICAgICdvYmplY3RTdG9yZU5hbWVzJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoREIsICdfZGInLCBJREJEYXRhYmFzZSwgW1xuICAgICdjbG9zZSdcbiAgXSk7XG5cbiAgLy8gQWRkIGN1cnNvciBpdGVyYXRvcnNcbiAgLy8gVE9ETzogcmVtb3ZlIHRoaXMgb25jZSBicm93c2VycyBkbyB0aGUgcmlnaHQgdGhpbmcgd2l0aCBwcm9taXNlc1xuICBbJ29wZW5DdXJzb3InLCAnb3BlbktleUN1cnNvciddLmZvckVhY2goZnVuY3Rpb24oZnVuY05hbWUpIHtcbiAgICBbT2JqZWN0U3RvcmUsIEluZGV4XS5mb3JFYWNoKGZ1bmN0aW9uKENvbnN0cnVjdG9yKSB7XG4gICAgICAvLyBEb24ndCBjcmVhdGUgaXRlcmF0ZUtleUN1cnNvciBpZiBvcGVuS2V5Q3Vyc29yIGRvZXNuJ3QgZXhpc3QuXG4gICAgICBpZiAoIShmdW5jTmFtZSBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG5cbiAgICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZVtmdW5jTmFtZS5yZXBsYWNlKCdvcGVuJywgJ2l0ZXJhdGUnKV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSB0b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcbiAgICAgICAgdmFyIG5hdGl2ZU9iamVjdCA9IHRoaXMuX3N0b3JlIHx8IHRoaXMuX2luZGV4O1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5hdGl2ZU9iamVjdFtmdW5jTmFtZV0uYXBwbHkobmF0aXZlT2JqZWN0LCBhcmdzLnNsaWNlKDAsIC0xKSk7XG4gICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY2FsbGJhY2socmVxdWVzdC5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgfTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gcG9seWZpbGwgZ2V0QWxsXG4gIFtJbmRleCwgT2JqZWN0U3RvcmVdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCkgcmV0dXJuO1xuICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihxdWVyeSwgY291bnQpIHtcbiAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXM7XG4gICAgICB2YXIgaXRlbXMgPSBbXTtcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgaW5zdGFuY2UuaXRlcmF0ZUN1cnNvcihxdWVyeSwgZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgICAgaWYgKCFjdXJzb3IpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpdGVtcy5wdXNoKGN1cnNvci52YWx1ZSk7XG5cbiAgICAgICAgICBpZiAoY291bnQgIT09IHVuZGVmaW5lZCAmJiBpdGVtcy5sZW5ndGggPT0gY291bnQpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdXJzb3IuY29udGludWUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICB2YXIgZXhwID0ge1xuICAgIG9wZW46IGZ1bmN0aW9uKG5hbWUsIHZlcnNpb24sIHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdvcGVuJywgW25hbWUsIHZlcnNpb25dKTtcbiAgICAgIHZhciByZXF1ZXN0ID0gcC5yZXF1ZXN0O1xuXG4gICAgICBpZiAocmVxdWVzdCkge1xuICAgICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgICAgICAgdXBncmFkZUNhbGxiYWNrKG5ldyBVcGdyYWRlREIocmVxdWVzdC5yZXN1bHQsIGV2ZW50Lm9sZFZlcnNpb24sIHJlcXVlc3QudHJhbnNhY3Rpb24pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24oZGIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEQihkYik7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGRlbGV0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ2RlbGV0ZURhdGFiYXNlJywgW25hbWVdKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBleHA7XG4gICAgbW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IG1vZHVsZS5leHBvcnRzO1xuICB9XG4gIGVsc2Uge1xuICAgIHNlbGYuaWRiID0gZXhwO1xuICB9XG59KCkpO1xuIl0sImZpbGUiOiJpZGIuanMifQ==
