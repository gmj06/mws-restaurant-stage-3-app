let restaurantNeighborhoods;
let restaurantCuisines;
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
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback, id) {
    //console.log("dbhelper .. objectstore ", IDBHelper.name);
    return IDBHelper.fetchFromIDB().then(restaurants => {
      //console.log("idbhelper .. fetchRestaurants", restaurants);
      if (restaurants.length > 0) {
        return Promise.resolve(restaurants);
      } else {
        return IDBHelper.fetchFromAPIInsertIntoIDB(id);
      }
    }).then(restaurants => {
      console.log("dbhelper .. restaurants...", restaurants);
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
      restaurantNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
      //console.log("dbhelper .. restaurantNeighborhoods", restaurantNeighborhoods);
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
      restaurantCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
      //console.log("dbhelper .. restaurantCuisines", restaurantCuisines);      
      callback(null, restaurants);
    }).catch(error => {
      callback(error, null);
    });


    // fetch(DBHelper.DATABASE_URL)
    //   .then(response => response.json())
    //   .then(restaurants => {
    //     if(restaurants){
    //       callback(null, restaurants);
    //     }
    //   }).catch(error => {
    //     callback(`Request failed. Returned status of ${error}`, null);
    //   });


    // let xhr = new XMLHttpRequest();
    // xhr.open('GET', DBHelper.DATABASE_URL);
    // xhr.onload = () => {
    //   if (xhr.status === 200) { // Got a success response from server!
    //     const json = JSON.parse(xhr.responseText);
    //     const restaurants = json.restaurants;
    //     console.log("fetchRestaurants...", restaurants);
    //     callback(null, restaurants);
    //   } else { // Oops!. Got an error from server.
    //     const error = (`Request failed. Returned status of ${xhr.status}`);
    //     callback(error, null);
    //   }
    // };
    // xhr.send();
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        console.log("dbhelper .. fetchRestaurantById ...", restaurants);
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
    if(restaurantNeighborhoods){
      callback(null, restaurantNeighborhoods);
      return;
    }
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        console.log("fetchNeighborhoods ", restaurants);
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
    if(restaurantCuisines){
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
  static updateIsFavorite(restaurantId, newState){
    IDBHelper.updateIsFavorite(restaurantId, newState);   
  }


  /**
   * Fetch all reviews.
   */
  static fetchReviewsByRestaurantId(restaurantId, callback)  {
    //console.log("dbhelper .. fetchReviewsByRestaurantId ObjectStore", IDBHelper.name);
    return IDBHelper.fetchReviewsFromIDBByRestaurantId(restaurantId).then(reviews => {
      //console.log("idbhelper .. fetchReviewsByRestaurantId IDB", reviews);
      if (reviews && reviews.length > 0) {
        //console.log("dbhelper .. fetchReviewsByRestaurantId .. if");
        return Promise.resolve(reviews);
      } else {
        //console.log("dbhelper .. fetchReviewsByRestaurantId .. else");
        return IDBHelper.fetchReviewsFromAPIInsertIntoIDB(restaurantId);
      }
    }).then(reviews => { 
      //console.log("dbhelper .. fetchReviewsByRestaurantId then", reviews);        
      callback(null, reviews.reverse());
    }).catch(error => {
      callback(error, null);
    });
  }

  static updateReviewWhenOnline(obj, callback){
    localStorage.setItem('offline-review-data', JSON.stringify(obj.data));

      window.addEventListener('online', event => {
        console.log("connection is online now");
        const offlineData = JSON.parse(localStorage.getItem('offline-review-data'));
        const offlineReviews = document.querySelectorAll('.review-offline-mode');
        document.querySelector('.offline-mode-label').remove();
        [...offlineReviews].forEach(review => {
          review.classList.remove('review-offline-mode');
        })

        console.log("OFFLINEDATE....", offlineData);
        if(offlineData != null){          
          if(obj.type === 'review'){
            console.log("OFFLINE MODE", offlineData);
            this.addNewReview(offlineData["restaurant_id"],offlineData, callback); 
          }       
          localStorage.removeItem('offline-review-data');
        }        
      });
  }

  static addNewReview(restaurantId, reviewObj, callback){
    const obj = {
      data: reviewObj,
      type: 'review'
    };

    if(!window.navigator.onLine && obj.type === 'review'){
      this.updateReviewWhenOnline(obj, callback);
      return;
    }

    IDBHelper.addNewReview(restaurantId, reviewObj, (error, result) =>{
      if(error){
        callback(error, null);
        return;
      }
      callback(null, result);
    });   
  }

  
}
