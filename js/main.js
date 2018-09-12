let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  if(restaurants.length === 0){
    const span = document.createElement('span');
    span.classList = ["text-danger", "font-weight-bold"];
    span.textContent = "NO RESTAURANT(s) FOUND";
    ul.append(span);
  }else{
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  const imageurl = DBHelper.imageUrlForRestaurant(restaurant, "tiles");
  const imgparts = imageurl.split(".");
  const imgurl1x = imgparts[0] + "-350w_1x." + imgparts[1];
  const imgurl2x = imgparts[0] + "-700w_2x." + imgparts[1];
  image.src = imgurl1x;
  image.srcset = `${imgurl1x} 350w, ${imgurl2x} 700w`;
  image.alt = restaurant.name + " tile image";
  li.append(image);
  

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

 
  var isFavorite = (restaurant.is_favorite && restaurant.is_favorite == "true") ? true : false;  
  const btnFavorite = document.createElement('button');
  btnFavorite.innerHTML = '❤';  
  btnFavorite.type = "button"
  btnFavorite.setAttribute('id', `btnFavorite-${restaurant.id}`);
  btnFavorite.classList.add("btn-favorite");  
  restaurant.is_favorite = isFavorite;
  btnFavorite.onclick = () => {
    var currentState = !restaurant.is_favorite;
    DBHelper.updateIsFavorite(restaurant.id, currentState);
    restaurant.is_favorite = !restaurant.is_favorite;
    changeBtnFavoriteClass(btnFavorite, restaurant.is_favorite);
  }
  changeBtnFavoriteClass(btnFavorite, restaurant.is_favorite);
  li.append(btnFavorite);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.type = "button"
  li.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });  
}

/**
   * Change class based on btnFavorite button click
   */
  changeBtnFavoriteClass = (btn, currentState) => {
    if(!currentState){  
      btn.classList.remove("btn-favorite-true");
      btn.classList.add('btn-favorite-false');
      btn.setAttribute('aria-label', 'Make me as your favorite restaurant');
      btn.setAttribute('text', 'Make me as your favorite restaurant');
    }else{
      btn.classList.remove('btn-favorite-false');    
      btn.classList.add("btn-favorite-true");
      btn.setAttribute('aria-label', 'I am your favorite restaurant');
      btn.setAttribute('text', 'I am your favorite restaurant');
    }  
  }
  
  /**
   * Updating the restaurant is_favorite state.
   */
  // isFavoriteClicked = (restaurant, newState) => {
  //   //restaurant.is_favorite = newState;      
  //   //DBHelper.updateIsFavorite(restaurant, newState);
  //   console.log("old state..", restaurant["is_favorite"], "..new state...", !restaurant["is_favorite"]);
  //   changeBtnFavoriteClass(document.getElementById(`btnFavorite-${restaurant.id}`), restaurant.is_favorite);
   
  // }
