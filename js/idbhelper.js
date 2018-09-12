const port = 1337 // Change this to your server port
const OBJECTSTORE = 'restaurants';
const REVIEWOBJECTSTORE = 'reviews';


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

        return idb.open('restaurants', 4, function (upgradeDb) {
            switch (upgradeDb.oldVersion) {
                case 0:
                    upgradeDb.createObjectStore(OBJECTSTORE, { keyPath: 'id' });
                case 1:
                    var restaurantStore = upgradeDb.transaction.objectStore(OBJECTSTORE);
                    restaurantStore.createIndex('by-id', 'id');
                case 2:
                    var reviewStore = upgradeDb.createObjectStore(REVIEWOBJECTSTORE, { keyPath: 'id' });
                    reviewStore.createIndex('by-restaurant-id', 'restaurant_id');
                    reviewStore.createIndex('by-review-id', 'id');
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

    static updateIsFavorite(restaurantId, newState){
        fetch(`${DBHelper.DATABASE_URL}/${restaurantId}/?is_favorite=${newState}`, {
            method: 'PUT'
          })
          .then(() => {
            console.log(`Favorite status of restaurant ${restaurantId} is successfully changed to ${newState}`);
            return IDBHelper.openIDB().then(db => {
                if(!db) return;
                var tx = db.transaction(OBJECTSTORE, 'readwrite');
                
                var restaurantObjectStore = tx.objectStore(OBJECTSTORE);
                restaurantObjectStore.get(restaurantId)
                .then(restaurant => {
                    restaurant.is_favorite = newState;
                    restaurantObjectStore.put(restaurant);
                })           
            })
          })
          .catch(error => console.log('updateIsFavorite', error));    
    }

    static fetchReviewsFromIDBByRestaurantId(restaurantId) {
        console.log("idbhelper..fetchReviewsFromIDBByRestaurantId", restaurantId);
        return IDBHelper.openIDB().then(db => {
            if (!db) return;
            var store = db.transaction(REVIEWOBJECTSTORE).objectStore(REVIEWOBJECTSTORE).index('by-review-id');
            console.log("fetchReviewsFromIDBByRestaurantId", store.getAll());
            return store.getAll();
        });
    };

    static insertReviewsIntoIndexDBByRestaurantId(data) {
        console.log("idbhelper..insertReviewsIntoIndexDBByRestaurantId.. 1", data);
        return IDBHelper.openIDB().then(function (db) {
            if (!db) return;

            var tx = db.transaction(REVIEWOBJECTSTORE, 'readwrite');
            var store = tx.objectStore(REVIEWOBJECTSTORE);           
            data.forEach(review => {
                console.log("idbhelper..inserting reviews", review);
                store.put(review);
            });
            return tx.complete;
        });
    };

    static fetchReviewsFromAPIInsertIntoIDB(restaurantId) {
        console.log("idbhelper.. fetchReviewsFromAPIInsertIntoIDB..", DBHelper.DATABASE_REVIEW_URL);
        return fetch(`${DBHelper.DATABASE_REVIEW_URL}/?restaurant_id=${restaurantId}`)
            .then(response => {
                return response.json()
            }).then(IDBHelper.insertReviewsIntoIndexDBByRestaurantId)
    };

    static addNewReviewToIDB(restaurantId, reviewObj){
        console.log("idbhelper..addNewReviewToIDB..", reviewObj);
        return IDBHelper.openIDB().then(function (db) {
            if (!db) return;

            var store = db.transaction(REVIEWOBJECTSTORE, 'readwrite').objectStore(REVIEWOBJECTSTORE); 
           // var store = tx.objectStore(REVIEWOBJECTSTORE);           
            data.forEach(review => {
                console.log("idbhelper..inserting reviews", review);
                store.put(review);
            });
            return tx.complete;
        });
    }

    static addNewReview(restaurantId, reviewObj, callback){
        //addNewReviewToIDB(restaurantId, reviewObj);
        const options = {
            method: 'POST',
            data: JSON.stringify(reviewObj)
            // ,headers: {
            //     "Content-Type": "application/json; charset=utf-8"
            // }
        };

        fetch(`${DBHelper.DATABASE_REVIEW_URL}`, {
            method: 'POST',
            body: JSON.stringify(reviewObj)
        })
        .then(response => response.json())
        .then(review => {
            console.log("Successfully added new review to database", review);
            callback(null, review);
        })
        .catch(error => {
            console.log('Unable to add new review to database', error);
            callback(error, null);
        });
    }

}