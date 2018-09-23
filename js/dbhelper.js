'use strict';

let restaurantNeighborhoods;
let restaurantCuisines;
let restaurantsList;
//const port = 1337 // Change this to your server port

/**
 * Common database helper functions.
 */
class DBHelper {
  /**
    * Database URL.
    * Change this to restaurants.json file location on your server.
    */
  static get DATABASE_URL() {
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Database Review URL. 
   */
  static get DATABASE_REVIEW_URL() {
    return `http://localhost:${port}/reviews`;
  }

  /**
   * Map location latitude and longitude
   */
  static get MAP_LOC(){
    return {
      lat: 40.722216,
      lng: -73.987501
    };
  }

  /**
  * Fetch all restaurants.
  */
  static fetchRestaurants(callback, id) {    
    return IDBHelper.fetchFromIDB()
      .then(restaurants => {
        if (restaurants.length > 0) {
          return Promise.resolve(restaurants);
        } else {
          return IDBHelper.fetchFromAPIInsertIntoIDB(id);
        }
      }).then(restaurants => {
        restaurantsList = restaurants;        
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        restaurantNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        restaurantCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        
        callback(null, restaurants);
      }).catch(error => {
        callback(error, null);
      });
  }


  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    if (restaurantsList !== undefined && (restaurantsList && restaurantsList.length > 0)) {
      const restaurant = restaurantsList.find(r => r.id == id);
      if (restaurant) { // Got the restaurant
        callback(null, restaurant);
      } else {
        callback('Restaurant does not exist', null);
      }
      return;
    }
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {      
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {    
    if (restaurantsList !== undefined && (restaurantsList && restaurantsList.length > 0)) {
      const results = restaurantsList.filter(r => r.cuisine_type == cuisine);
      callback(null, results);
      return;
    }
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    if (restaurantsList !== undefined && (restaurantsList && restaurantsList.length > 0)) {
      const results = restaurantsList.filter(r => r.neighborhood == neighborhood);
      callback(null, results);
      return;
    }
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    if (restaurantsList !== undefined && (restaurantsList && restaurantsList.length > 0)) {
      let results = restaurantsList;
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      callback(null, results);
      return;
    }
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    if (restaurantNeighborhoods !== undefined && (restaurantNeighborhoods && restaurantNeighborhoods.length > 0)) {    
      callback(null, restaurantNeighborhoods);
      return;
    }
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    if (restaurantCuisines !== undefined && (restaurantCuisines && restaurantCuisines.length > 0)) {        
      callback(null, restaurantCuisines);
      return;
    }

    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant, type) {
    return (`/img/${type}/${restaurant.id}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    }
    );
    return marker;
  }

  /**
  * Change restaurant favorite state.
  */
  static updateIsFavorite(restaurantId, newState) {
    IDBHelper.updateIsFavorite(restaurantId, newState);
  }


  /**
   * Fetch all reviews.
   */
  static fetchReviewsByRestaurantId(restaurantId, callback) {
    return IDBHelper.fetchReviewsFromIDBByRestaurantId(restaurantId).then(reviews => {
      if (reviews && reviews.length > 0) {
        return Promise.resolve(reviews);
      } else {
        return IDBHelper.fetchReviewsFromAPIInsertIntoIDB(restaurantId);
      }
    }).then(reviews => {
      callback(null, reviews.reverse());
    }).catch(error => {
      callback(error, null);
    });
  }

  static updateReviewWhenOnline(obj, callback) {
    localStorage.setItem('offline-review-data', JSON.stringify(obj.data));

    window.addEventListener('online', event => {
      console.log("connection is online now");
      const offlineData = JSON.parse(localStorage.getItem('offline-review-data'));
      const offlineReviews = document.querySelectorAll('.review-offline-mode');
      document.querySelector('.offline-mode-label').remove();
      [...offlineReviews].forEach(review => {
        review.classList.remove('review-offline-mode');
      })
     
      if (offlineData != null) {
        if (obj.type === 'review') {         
          this.addNewReview(offlineData["restaurant_id"], offlineData, callback);
        }
        localStorage.removeItem('offline-review-data');
      }
    });
  }

  static addNewReview(restaurantId, reviewObj, callback) {
    const obj = {
      data: reviewObj,
      type: 'review'
    };

    if (!window.navigator.onLine && obj.type === 'review') {
      this.updateReviewWhenOnline(obj, callback);
      return;
    }

    IDBHelper.addNewReview(restaurantId, reviewObj, (error, result) => {
      if (error) {
        callback(error, null);
        return;
      }
      callback(null, result);
    });
  }

  /**   
   * Display Restaurant Map Marker on Static Map
   */
  static displayStaticMap(restaurants) {
    let url = `https://maps.googleapis.com/maps/api/staticmap?center=${
    this.MAP_LOC.lat},${this.MAP_LOC.lng}&zoom=12&size=${
    document.documentElement.clientWidth}x400&markers=color:red`;
    restaurants.forEach(r => {
      url += `|${r.latlng.lat},${r.latlng.lng}`;
    });
    url += "&key=AIzaSyBQIcEDJHQfAjAU9DA7PaMHTh8T3BnETkk";
    return url;
  }

  static displayStaticMapOnDetailsPage(restaurant){
    let url = `https://maps.googleapis.com/maps/api/staticmap?center=${
      restaurant.latlng.lat},${restaurant.latlng.lng}&zoom=16&size=${
    document.documentElement.clientWidth}x400&markers=color:red`;
    url += `|${restaurant.latlng.lat},${restaurant.latlng.lng}|`;
    url += "&key=AIzaSyBQIcEDJHQfAjAU9DA7PaMHTh8T3BnETkk";
    return url;
  }
}
