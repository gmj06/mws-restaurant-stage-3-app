const port = 1337 // Change this to your server port
const OBJECTSTORE = 'restaurants';


/**
 * IndexDB database helper functions.
 */
class IDBHelper {
    static openIDB() {
        if (!navigator.serviceWorker) { return Promise.resolve(); }
        if (!self.indexedDB) reject("IndexedDB is NOT supported in this browser!");
        // if( 'function' === typeof importScripts || (typeof idb === "undefined") ) {
        //       importScripts('js/idb.js');
        // }

        return idb.open('restaurants', 2, function (upgradeDb) {
            switch (upgradeDb.oldVersion) {
                case 0:
                    upgradeDb.createObjectStore(OBJECTSTORE, { keyPath: 'id' });
                case 1:
                    var restaurantStore = upgradeDb.transaction.objectStore(OBJECTSTORE);
                    restaurantStore.createIndex('by-id', 'id');

            }
        });
    }

    static insertIntoIndexDB(data) {
        console.log("idbhelper..insertIntoIDB..", data);
        return IDBHelper.openIDB().then(function (db) {
            if (!db) return;

            var tx = db.transaction(OBJECTSTORE, 'readwrite');
            var store = tx.objectStore(OBJECTSTORE);
            data.forEach(restaurant => {
                store.put(restaurant);
            });
            return tx.complete;
        });
    };


    static fetchFromAPIInsertIntoIDB(id) {
        let fetchURL;
        if (!id) {
            fetchURL = DBHelper.DATABASE_URL;
        }else{
            fetchURL = DBHelper.DATABASE_URL + '/' + id;
        }
        console.log("idbhelper.. fetchFromAPIInsertIntoIDB");
        return fetch(fetchURL)
            .then(response => {
                return response.json()
            }).then(IDBHelper.insertIntoIndexDB)
    };

    static fetchFromIDB() {
        return IDBHelper.openIDB().then(db => {
            if (!db) return;
            var store = db.transaction(OBJECTSTORE).objectStore(OBJECTSTORE);
            console.log("fetchFromIDB", store.getAll());
            return store.getAll();
        });
    };


}