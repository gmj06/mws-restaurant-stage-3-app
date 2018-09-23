let restaurants, neighborhoods, cuisines;
var map;
var markers = [];
/**
 * Lazy Loading Images by setting src attribute only after page load and removing data-src attribute 
 */
// window.onload = () => {
//   [].forEach.call(document.querySelectorAll('img.restaurant-img[data-src]'), function(img) {
//     img.setAttribute('src', img.getAttribute('data-src'));
//     img.onload = function() {
//       img.removeAttribute('data-src');
//     };
//   });  
// }

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */

document.addEventListener('DOMContentLoaded', event => {
  console.log("domcontentloaded load");
  fetchNeighborhoods();
  fetchCuisines(); // [].forEach.call(document.querySelectorAll('img.restaurant-img[data-src]'), function (img) {
  //   img.setAttribute('src', img.getAttribute('data-src'));
  //   img.onload = function () {
  //     img.removeAttribute('data-src');
  //   };
  // });
});
/**
 * Fetch all neighborhoods and set their HTML.
 */

fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};
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
};
/**
 * Fetch all cuisines and set their HTML.
 */


fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};
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
};
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
};
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
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
};
/**
 * Clear current restaurants, their HTML and remove their map markers.
 */


resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = ''; // Remove all map markers

  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};
/**
 * Create all restaurants HTML and add them to the webpage.
 */


fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');

  if (restaurants === undefined || restaurants && restaurants.length === 0) {
    const span = document.createElement('span');
    span.classList = ["text-danger", "font-weight-bold"];
    span.textContent = "NO RESTAURANT(s) FOUND";
    ul.append(span);
  } else {
    restaurants.forEach(restaurant => {
      ul.append(createRestaurantHTML(restaurant));
    });
    addMarkersToMap();
  }
};
/**
 * Create restaurant HTML.
 */


createRestaurantHTML = restaurant => {
  const li = document.createElement('li');
  const imageurl = DBHelper.imageUrlForRestaurant(restaurant, "tiles");
  const imgparts = imageurl.split(".");
  const imgurl1x = imgparts[0] + "-350w_1x." + imgparts[1];
  const imgurl2x = imgparts[0] + "-700w_2x." + imgparts[1];
  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = imgurl1x;
  image.srcset = `${imgurl1x} 350w, ${imgurl2x} 700w`;
  image.alt = restaurant.name + " tile image"; //image.setAttribute('data-src', imgurl1x);

  li.append(image);
  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);
  var isFavorite = restaurant.is_favorite && restaurant.is_favorite == "true" ? true : false;
  const btnFavorite = document.createElement('button');
  btnFavorite.innerHTML = '❤';
  btnFavorite.type = "button";
  btnFavorite.setAttribute('id', `btnFavorite-${restaurant.id}`);
  btnFavorite.classList.add("btn-favorite");
  restaurant.is_favorite = isFavorite;

  btnFavorite.onclick = () => {
    var currentState = !restaurant.is_favorite;
    DBHelper.updateIsFavorite(restaurant.id, currentState);
    restaurant.is_favorite = !restaurant.is_favorite;
    changeBtnFavoriteClass(btnFavorite, restaurant.is_favorite);
  };

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
  more.type = "button";
  li.append(more);
  return li;
};
/**
 * Add markers for current restaurants to the map.
 */


addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};
/**
   * Change class based on btnFavorite button click
   */


changeBtnFavoriteClass = (btn, currentState) => {
  if (!currentState) {
    btn.classList.remove("btn-favorite-true");
    btn.classList.add('btn-favorite-false');
    btn.setAttribute('aria-label', 'Make me as your favorite restaurant');
    btn.setAttribute('text', 'Make me as your favorite restaurant');
  } else {
    btn.classList.remove('btn-favorite-false');
    btn.classList.add("btn-favorite-true");
    btn.setAttribute('aria-label', 'I am your favorite restaurant');
    btn.setAttribute('text', 'I am your favorite restaurant');
  }
};
/**
 * Updating the restaurant is_favorite state.
 */
// isFavoriteClicked = (restaurant, newState) => {
//   //restaurant.is_favorite = newState;      
//   //DBHelper.updateIsFavorite(restaurant, newState);
//   console.log("old state..", restaurant["is_favorite"], "..new state...", !restaurant["is_favorite"]);
//   changeBtnFavoriteClass(document.getElementById(`btnFavorite-${restaurant.id}`), restaurant.is_favorite);
// }
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOlsicmVzdGF1cmFudHMiLCJuZWlnaGJvcmhvb2RzIiwiY3Vpc2luZXMiLCJtYXAiLCJtYXJrZXJzIiwiZG9jdW1lbnQiLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJjb25zb2xlIiwibG9nIiwiZmV0Y2hOZWlnaGJvcmhvb2RzIiwiZmV0Y2hDdWlzaW5lcyIsIkRCSGVscGVyIiwiZXJyb3IiLCJzZWxmIiwiZmlsbE5laWdoYm9yaG9vZHNIVE1MIiwic2VsZWN0IiwiZ2V0RWxlbWVudEJ5SWQiLCJmb3JFYWNoIiwibmVpZ2hib3Job29kIiwib3B0aW9uIiwiY3JlYXRlRWxlbWVudCIsImlubmVySFRNTCIsInZhbHVlIiwiYXBwZW5kIiwiZmlsbEN1aXNpbmVzSFRNTCIsImN1aXNpbmUiLCJ3aW5kb3ciLCJpbml0TWFwIiwibG9jIiwibGF0IiwibG5nIiwiZ29vZ2xlIiwibWFwcyIsIk1hcCIsInpvb20iLCJjZW50ZXIiLCJzY3JvbGx3aGVlbCIsInVwZGF0ZVJlc3RhdXJhbnRzIiwiY1NlbGVjdCIsIm5TZWxlY3QiLCJjSW5kZXgiLCJzZWxlY3RlZEluZGV4IiwibkluZGV4IiwiZmV0Y2hSZXN0YXVyYW50QnlDdWlzaW5lQW5kTmVpZ2hib3Job29kIiwicmVzZXRSZXN0YXVyYW50cyIsImZpbGxSZXN0YXVyYW50c0hUTUwiLCJ1bCIsIm0iLCJzZXRNYXAiLCJ1bmRlZmluZWQiLCJsZW5ndGgiLCJzcGFuIiwiY2xhc3NMaXN0IiwidGV4dENvbnRlbnQiLCJyZXN0YXVyYW50IiwiY3JlYXRlUmVzdGF1cmFudEhUTUwiLCJhZGRNYXJrZXJzVG9NYXAiLCJsaSIsImltYWdldXJsIiwiaW1hZ2VVcmxGb3JSZXN0YXVyYW50IiwiaW1ncGFydHMiLCJzcGxpdCIsImltZ3VybDF4IiwiaW1ndXJsMngiLCJpbWFnZSIsImNsYXNzTmFtZSIsInNyYyIsInNyY3NldCIsImFsdCIsIm5hbWUiLCJpc0Zhdm9yaXRlIiwiaXNfZmF2b3JpdGUiLCJidG5GYXZvcml0ZSIsInR5cGUiLCJzZXRBdHRyaWJ1dGUiLCJpZCIsImFkZCIsIm9uY2xpY2siLCJjdXJyZW50U3RhdGUiLCJ1cGRhdGVJc0Zhdm9yaXRlIiwiY2hhbmdlQnRuRmF2b3JpdGVDbGFzcyIsImFkZHJlc3MiLCJtb3JlIiwiaHJlZiIsInVybEZvclJlc3RhdXJhbnQiLCJtYXJrZXIiLCJtYXBNYXJrZXJGb3JSZXN0YXVyYW50IiwiYWRkTGlzdGVuZXIiLCJsb2NhdGlvbiIsInVybCIsInB1c2giLCJidG4iLCJyZW1vdmUiXSwibWFwcGluZ3MiOiJBQUFBLElBQUlBLFdBQUosRUFDRUMsYUFERixFQUVFQyxRQUZGO0FBR0EsSUFBSUMsR0FBSjtBQUNBLElBQUlDLE9BQU8sR0FBRyxFQUFkO0FBRUE7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBR0E7Ozs7QUFHQUMsUUFBUSxDQUFDQyxnQkFBVCxDQUEwQixrQkFBMUIsRUFBK0NDLEtBQUQsSUFBVztBQUN2REMsRUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksdUJBQVo7QUFDQUMsRUFBQUEsa0JBQWtCO0FBQ2xCQyxFQUFBQSxhQUFhLEdBSDBDLENBS3ZEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNELENBWEQ7QUFjQTs7OztBQUdBRCxrQkFBa0IsR0FBRyxNQUFNO0FBQ3pCRSxFQUFBQSxRQUFRLENBQUNGLGtCQUFULENBQTRCLENBQUNHLEtBQUQsRUFBUVosYUFBUixLQUEwQjtBQUNwRCxRQUFJWSxLQUFKLEVBQVc7QUFBRTtBQUNYTCxNQUFBQSxPQUFPLENBQUNLLEtBQVIsQ0FBY0EsS0FBZDtBQUNELEtBRkQsTUFFTztBQUNMQyxNQUFBQSxJQUFJLENBQUNiLGFBQUwsR0FBcUJBLGFBQXJCO0FBQ0FjLE1BQUFBLHFCQUFxQjtBQUN0QjtBQUNGLEdBUEQ7QUFRRCxDQVREO0FBV0E7Ozs7O0FBR0FBLHFCQUFxQixHQUFHLENBQUNkLGFBQWEsR0FBR2EsSUFBSSxDQUFDYixhQUF0QixL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QUFzQyxPQUF0QyxFQUErQyxNQUFNO0FBQ25EM0QsTUFBQUEsTUFBTSxDQUFDOEQsUUFBUCxDQUFnQkwsSUFBaEIsR0FBdUJFLE1BQU0sQ0FBQ0ksR0FBOUI7QUFDRCxLQUZEO0FBR0E1RSxJQUFBQSxJQUFJLENBQUNWLE9BQUwsQ0FBYXVGLElBQWIsQ0FBa0JMLE1BQWxCO0FBQ0QsR0FQRDtBQVFELENBVEQ7QUFXQTs7Ozs7QUFHQUwsc0JBQXNCLEdBQUcsQ0FBQ1csR0FBRCxFQUFNYixZQUFOLEtBQXVCO0FBQzlDLE1BQUksQ0FBQ0EsWUFBTCxFQUFtQjtBQUNqQmEsSUFBQUEsR0FBRyxDQUFDdkMsU0FBSixDQUFjd0MsTUFBZCxDQUFxQixtQkFBckI7QUFDQUQsSUFBQUEsR0FBRyxDQUFDdkMsU0FBSixDQUFjd0IsR0FBZCxDQUFrQixvQkFBbEI7QUFDQWUsSUFBQUEsR0FBRyxDQUFDakIsWUFBSixDQUFpQixZQUFqQixFQUErQixxQ0FBL0I7QUFDQWlCLElBQUFBLEdBQUcsQ0FBQ2pCLFlBQUosQ0FBaUIsTUFBakIsRUFBeUIscUNBQXpCO0FBQ0QsR0FMRCxNQUtPO0FBQ0xpQixJQUFBQSxHQUFHLENBQUN2QyxTQUFKLENBQWN3QyxNQUFkLENBQXFCLG9CQUFyQjtBQUNBRCxJQUFBQSxHQUFHLENBQUN2QyxTQUFKLENBQWN3QixHQUFkLENBQWtCLG1CQUFsQjtBQUNBZSxJQUFBQSxHQUFHLENBQUNqQixZQUFKLENBQWlCLFlBQWpCLEVBQStCLCtCQUEvQjtBQUNBaUIsSUFBQUEsR0FBRyxDQUFDakIsWUFBSixDQUFpQixNQUFqQixFQUF5QiwrQkFBekI7QUFDRDtBQUNGLENBWkQ7QUFjRTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBIiwic291cmNlc0NvbnRlbnQiOlsibGV0IHJlc3RhdXJhbnRzLFxyXG4gIG5laWdoYm9yaG9vZHMsXHJcbiAgY3Vpc2luZXNcclxudmFyIG1hcFxyXG52YXIgbWFya2VycyA9IFtdXHJcblxyXG4vKipcclxuICogTGF6eSBMb2FkaW5nIEltYWdlcyBieSBzZXR0aW5nIHNyYyBhdHRyaWJ1dGUgb25seSBhZnRlciBwYWdlIGxvYWQgYW5kIHJlbW92aW5nIGRhdGEtc3JjIGF0dHJpYnV0ZSBcclxuICovXHJcbi8vIHdpbmRvdy5vbmxvYWQgPSAoKSA9PiB7XHJcbi8vICAgW10uZm9yRWFjaC5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2ltZy5yZXN0YXVyYW50LWltZ1tkYXRhLXNyY10nKSwgZnVuY3Rpb24oaW1nKSB7XHJcbi8vICAgICBpbWcuc2V0QXR0cmlidXRlKCdzcmMnLCBpbWcuZ2V0QXR0cmlidXRlKCdkYXRhLXNyYycpKTtcclxuLy8gICAgIGltZy5vbmxvYWQgPSBmdW5jdGlvbigpIHtcclxuLy8gICAgICAgaW1nLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1zcmMnKTtcclxuLy8gICAgIH07XHJcbi8vICAgfSk7ICBcclxuLy8gfVxyXG5cclxuXHJcbi8qKlxyXG4gKiBGZXRjaCBuZWlnaGJvcmhvb2RzIGFuZCBjdWlzaW5lcyBhcyBzb29uIGFzIHRoZSBwYWdlIGlzIGxvYWRlZC5cclxuICovXHJcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoZXZlbnQpID0+IHtcclxuICBjb25zb2xlLmxvZyhcImRvbWNvbnRlbnRsb2FkZWQgbG9hZFwiKTtcclxuICBmZXRjaE5laWdoYm9yaG9vZHMoKTtcclxuICBmZXRjaEN1aXNpbmVzKCk7XHJcblxyXG4gIC8vIFtdLmZvckVhY2guY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbWcucmVzdGF1cmFudC1pbWdbZGF0YS1zcmNdJyksIGZ1bmN0aW9uIChpbWcpIHtcclxuICAvLyAgIGltZy5zZXRBdHRyaWJ1dGUoJ3NyYycsIGltZy5nZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJykpO1xyXG4gIC8vICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuICAvLyAgICAgaW1nLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1zcmMnKTtcclxuICAvLyAgIH07XHJcbiAgLy8gfSk7XHJcbn0pO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBGZXRjaCBhbGwgbmVpZ2hib3Job29kcyBhbmQgc2V0IHRoZWlyIEhUTUwuXHJcbiAqL1xyXG5mZXRjaE5laWdoYm9yaG9vZHMgPSAoKSA9PiB7XHJcbiAgREJIZWxwZXIuZmV0Y2hOZWlnaGJvcmhvb2RzKChlcnJvciwgbmVpZ2hib3Job29kcykgPT4ge1xyXG4gICAgaWYgKGVycm9yKSB7IC8vIEdvdCBhbiBlcnJvclxyXG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNlbGYubmVpZ2hib3Job29kcyA9IG5laWdoYm9yaG9vZHM7XHJcbiAgICAgIGZpbGxOZWlnaGJvcmhvb2RzSFRNTCgpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogU2V0IG5laWdoYm9yaG9vZHMgSFRNTC5cclxuICovXHJcbmZpbGxOZWlnaGJvcmhvb2RzSFRNTCA9IChuZWlnaGJvcmhvb2RzID0gc2VsZi5uZWlnaGJvcmhvb2RzKSA9PiB7XHJcbiAgY29uc3Qgc2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ25laWdoYm9yaG9vZHMtc2VsZWN0Jyk7XHJcbiAgbmVpZ2hib3Job29kcy5mb3JFYWNoKG5laWdoYm9yaG9vZCA9PiB7XHJcbiAgICBjb25zdCBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcclxuICAgIG9wdGlvbi5pbm5lckhUTUwgPSBuZWlnaGJvcmhvb2Q7XHJcbiAgICBvcHRpb24udmFsdWUgPSBuZWlnaGJvcmhvb2Q7XHJcbiAgICBzZWxlY3QuYXBwZW5kKG9wdGlvbik7XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGZXRjaCBhbGwgY3Vpc2luZXMgYW5kIHNldCB0aGVpciBIVE1MLlxyXG4gKi9cclxuZmV0Y2hDdWlzaW5lcyA9ICgpID0+IHtcclxuICBEQkhlbHBlci5mZXRjaEN1aXNpbmVzKChlcnJvciwgY3Vpc2luZXMpID0+IHtcclxuICAgIGlmIChlcnJvcikgeyAvLyBHb3QgYW4gZXJyb3IhXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2VsZi5jdWlzaW5lcyA9IGN1aXNpbmVzO1xyXG4gICAgICBmaWxsQ3Vpc2luZXNIVE1MKCk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXQgY3Vpc2luZXMgSFRNTC5cclxuICovXHJcbmZpbGxDdWlzaW5lc0hUTUwgPSAoY3Vpc2luZXMgPSBzZWxmLmN1aXNpbmVzKSA9PiB7XHJcbiAgY29uc3Qgc2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2N1aXNpbmVzLXNlbGVjdCcpO1xyXG5cclxuICBjdWlzaW5lcy5mb3JFYWNoKGN1aXNpbmUgPT4ge1xyXG4gICAgY29uc3Qgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XHJcbiAgICBvcHRpb24uaW5uZXJIVE1MID0gY3Vpc2luZTtcclxuICAgIG9wdGlvbi52YWx1ZSA9IGN1aXNpbmU7XHJcbiAgICBzZWxlY3QuYXBwZW5kKG9wdGlvbik7XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBJbml0aWFsaXplIEdvb2dsZSBtYXAsIGNhbGxlZCBmcm9tIEhUTUwuXHJcbiAqL1xyXG53aW5kb3cuaW5pdE1hcCA9ICgpID0+IHtcclxuXHJcbiAgbGV0IGxvYyA9IHtcclxuICAgIGxhdDogNDAuNzIyMjE2LFxyXG4gICAgbG5nOiAtNzMuOTg3NTAxXHJcbiAgfTtcclxuICBzZWxmLm1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcCcpLCB7XHJcbiAgICB6b29tOiAxMixcclxuICAgIGNlbnRlcjogbG9jLFxyXG4gICAgc2Nyb2xsd2hlZWw6IGZhbHNlXHJcbiAgfSk7XHJcbiAgdXBkYXRlUmVzdGF1cmFudHMoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSBwYWdlIGFuZCBtYXAgZm9yIGN1cnJlbnQgcmVzdGF1cmFudHMuXHJcbiAqL1xyXG51cGRhdGVSZXN0YXVyYW50cyA9ICgpID0+IHtcclxuICBjb25zdCBjU2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2N1aXNpbmVzLXNlbGVjdCcpO1xyXG4gIGNvbnN0IG5TZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmVpZ2hib3Job29kcy1zZWxlY3QnKTtcclxuXHJcbiAgY29uc3QgY0luZGV4ID0gY1NlbGVjdC5zZWxlY3RlZEluZGV4O1xyXG4gIGNvbnN0IG5JbmRleCA9IG5TZWxlY3Quc2VsZWN0ZWRJbmRleDtcclxuXHJcbiAgY29uc3QgY3Vpc2luZSA9IGNTZWxlY3RbY0luZGV4XS52YWx1ZTtcclxuICBjb25zdCBuZWlnaGJvcmhvb2QgPSBuU2VsZWN0W25JbmRleF0udmFsdWU7XHJcblxyXG4gIERCSGVscGVyLmZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZUFuZE5laWdoYm9yaG9vZChjdWlzaW5lLCBuZWlnaGJvcmhvb2QsIChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgIGlmIChlcnJvcikgeyAvLyBHb3QgYW4gZXJyb3IhXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmVzZXRSZXN0YXVyYW50cyhyZXN0YXVyYW50cyk7XHJcbiAgICAgIGZpbGxSZXN0YXVyYW50c0hUTUwoKTtcclxuICAgIH1cclxuICB9KVxyXG59XHJcblxyXG4vKipcclxuICogQ2xlYXIgY3VycmVudCByZXN0YXVyYW50cywgdGhlaXIgSFRNTCBhbmQgcmVtb3ZlIHRoZWlyIG1hcCBtYXJrZXJzLlxyXG4gKi9cclxucmVzZXRSZXN0YXVyYW50cyA9IChyZXN0YXVyYW50cykgPT4ge1xyXG4gIC8vIFJlbW92ZSBhbGwgcmVzdGF1cmFudHNcclxuICBzZWxmLnJlc3RhdXJhbnRzID0gW107XHJcbiAgY29uc3QgdWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudHMtbGlzdCcpO1xyXG4gIHVsLmlubmVySFRNTCA9ICcnO1xyXG5cclxuICAvLyBSZW1vdmUgYWxsIG1hcCBtYXJrZXJzXHJcbiAgc2VsZi5tYXJrZXJzLmZvckVhY2gobSA9PiBtLnNldE1hcChudWxsKSk7XHJcbiAgc2VsZi5tYXJrZXJzID0gW107XHJcbiAgc2VsZi5yZXN0YXVyYW50cyA9IHJlc3RhdXJhbnRzO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGFsbCByZXN0YXVyYW50cyBIVE1MIGFuZCBhZGQgdGhlbSB0byB0aGUgd2VicGFnZS5cclxuICovXHJcbmZpbGxSZXN0YXVyYW50c0hUTUwgPSAocmVzdGF1cmFudHMgPSBzZWxmLnJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgY29uc3QgdWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudHMtbGlzdCcpO1xyXG4gIGlmIChyZXN0YXVyYW50cyA9PT0gdW5kZWZpbmVkIHx8IChyZXN0YXVyYW50cyAmJiByZXN0YXVyYW50cy5sZW5ndGggPT09IDApKSB7XHJcbiAgICBjb25zdCBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xyXG4gICAgc3Bhbi5jbGFzc0xpc3QgPSBbXCJ0ZXh0LWRhbmdlclwiLCBcImZvbnQtd2VpZ2h0LWJvbGRcIl07XHJcbiAgICBzcGFuLnRleHRDb250ZW50ID0gXCJOTyBSRVNUQVVSQU5UKHMpIEZPVU5EXCI7XHJcbiAgICB1bC5hcHBlbmQoc3Bhbik7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJlc3RhdXJhbnRzLmZvckVhY2gocmVzdGF1cmFudCA9PiB7XHJcbiAgICAgIHVsLmFwcGVuZChjcmVhdGVSZXN0YXVyYW50SFRNTChyZXN0YXVyYW50KSk7XHJcbiAgICB9KTtcclxuICAgIGFkZE1hcmtlcnNUb01hcCgpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSByZXN0YXVyYW50IEhUTUwuXHJcbiAqL1xyXG5jcmVhdGVSZXN0YXVyYW50SFRNTCA9IChyZXN0YXVyYW50KSA9PiB7XHJcbiAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG5cclxuICBjb25zdCBpbWFnZXVybCA9IERCSGVscGVyLmltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50LCBcInRpbGVzXCIpO1xyXG4gIGNvbnN0IGltZ3BhcnRzID0gaW1hZ2V1cmwuc3BsaXQoXCIuXCIpO1xyXG4gIGNvbnN0IGltZ3VybDF4ID0gaW1ncGFydHNbMF0gKyBcIi0zNTB3XzF4LlwiICsgaW1ncGFydHNbMV07XHJcbiAgY29uc3QgaW1ndXJsMnggPSBpbWdwYXJ0c1swXSArIFwiLTcwMHdfMnguXCIgKyBpbWdwYXJ0c1sxXTtcclxuXHJcbiAgY29uc3QgaW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcclxuICBpbWFnZS5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1pbWcnO1xyXG4gIGltYWdlLnNyYyA9IGltZ3VybDF4O1xyXG4gIGltYWdlLnNyY3NldCA9IGAke2ltZ3VybDF4fSAzNTB3LCAke2ltZ3VybDJ4fSA3MDB3YDtcclxuICBpbWFnZS5hbHQgPSByZXN0YXVyYW50Lm5hbWUgKyBcIiB0aWxlIGltYWdlXCI7XHJcbiAgLy9pbWFnZS5zZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJywgaW1ndXJsMXgpO1xyXG4gIGxpLmFwcGVuZChpbWFnZSk7XHJcblxyXG5cclxuICBjb25zdCBuYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDInKTtcclxuICBuYW1lLmlubmVySFRNTCA9IHJlc3RhdXJhbnQubmFtZTtcclxuICBsaS5hcHBlbmQobmFtZSk7XHJcblxyXG5cclxuICB2YXIgaXNGYXZvcml0ZSA9IChyZXN0YXVyYW50LmlzX2Zhdm9yaXRlICYmIHJlc3RhdXJhbnQuaXNfZmF2b3JpdGUgPT0gXCJ0cnVlXCIpID8gdHJ1ZSA6IGZhbHNlO1xyXG4gIGNvbnN0IGJ0bkZhdm9yaXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XHJcbiAgYnRuRmF2b3JpdGUuaW5uZXJIVE1MID0gJ+KdpCc7XHJcbiAgYnRuRmF2b3JpdGUudHlwZSA9IFwiYnV0dG9uXCJcclxuICBidG5GYXZvcml0ZS5zZXRBdHRyaWJ1dGUoJ2lkJywgYGJ0bkZhdm9yaXRlLSR7cmVzdGF1cmFudC5pZH1gKTtcclxuICBidG5GYXZvcml0ZS5jbGFzc0xpc3QuYWRkKFwiYnRuLWZhdm9yaXRlXCIpO1xyXG4gIHJlc3RhdXJhbnQuaXNfZmF2b3JpdGUgPSBpc0Zhdm9yaXRlO1xyXG4gIGJ0bkZhdm9yaXRlLm9uY2xpY2sgPSAoKSA9PiB7XHJcbiAgICB2YXIgY3VycmVudFN0YXRlID0gIXJlc3RhdXJhbnQuaXNfZmF2b3JpdGU7XHJcbiAgICBEQkhlbHBlci51cGRhdGVJc0Zhdm9yaXRlKHJlc3RhdXJhbnQuaWQsIGN1cnJlbnRTdGF0ZSk7XHJcbiAgICByZXN0YXVyYW50LmlzX2Zhdm9yaXRlID0gIXJlc3RhdXJhbnQuaXNfZmF2b3JpdGU7XHJcbiAgICBjaGFuZ2VCdG5GYXZvcml0ZUNsYXNzKGJ0bkZhdm9yaXRlLCByZXN0YXVyYW50LmlzX2Zhdm9yaXRlKTtcclxuICB9XHJcbiAgY2hhbmdlQnRuRmF2b3JpdGVDbGFzcyhidG5GYXZvcml0ZSwgcmVzdGF1cmFudC5pc19mYXZvcml0ZSk7XHJcbiAgbGkuYXBwZW5kKGJ0bkZhdm9yaXRlKTtcclxuXHJcbiAgY29uc3QgbmVpZ2hib3Job29kID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIG5laWdoYm9yaG9vZC5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5laWdoYm9yaG9vZDtcclxuICBsaS5hcHBlbmQobmVpZ2hib3Job29kKTtcclxuXHJcbiAgY29uc3QgYWRkcmVzcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICBhZGRyZXNzLmlubmVySFRNTCA9IHJlc3RhdXJhbnQuYWRkcmVzcztcclxuICBsaS5hcHBlbmQoYWRkcmVzcyk7XHJcblxyXG4gIGNvbnN0IG1vcmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XHJcbiAgbW9yZS5pbm5lckhUTUwgPSAnVmlldyBEZXRhaWxzJztcclxuICBtb3JlLmhyZWYgPSBEQkhlbHBlci51cmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpO1xyXG4gIG1vcmUudHlwZSA9IFwiYnV0dG9uXCJcclxuICBsaS5hcHBlbmQobW9yZSlcclxuXHJcbiAgcmV0dXJuIGxpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBZGQgbWFya2VycyBmb3IgY3VycmVudCByZXN0YXVyYW50cyB0byB0aGUgbWFwLlxyXG4gKi9cclxuYWRkTWFya2Vyc1RvTWFwID0gKHJlc3RhdXJhbnRzID0gc2VsZi5yZXN0YXVyYW50cykgPT4ge1xyXG4gIHJlc3RhdXJhbnRzLmZvckVhY2gocmVzdGF1cmFudCA9PiB7XHJcbiAgICAvLyBBZGQgbWFya2VyIHRvIHRoZSBtYXBcclxuICAgIGNvbnN0IG1hcmtlciA9IERCSGVscGVyLm1hcE1hcmtlckZvclJlc3RhdXJhbnQocmVzdGF1cmFudCwgc2VsZi5tYXApO1xyXG4gICAgZ29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIobWFya2VyLCAnY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gbWFya2VyLnVybFxyXG4gICAgfSk7XHJcbiAgICBzZWxmLm1hcmtlcnMucHVzaChtYXJrZXIpO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICAgKiBDaGFuZ2UgY2xhc3MgYmFzZWQgb24gYnRuRmF2b3JpdGUgYnV0dG9uIGNsaWNrXHJcbiAgICovXHJcbmNoYW5nZUJ0bkZhdm9yaXRlQ2xhc3MgPSAoYnRuLCBjdXJyZW50U3RhdGUpID0+IHtcclxuICBpZiAoIWN1cnJlbnRTdGF0ZSkge1xyXG4gICAgYnRuLmNsYXNzTGlzdC5yZW1vdmUoXCJidG4tZmF2b3JpdGUtdHJ1ZVwiKTtcclxuICAgIGJ0bi5jbGFzc0xpc3QuYWRkKCdidG4tZmF2b3JpdGUtZmFsc2UnKTtcclxuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCAnTWFrZSBtZSBhcyB5b3VyIGZhdm9yaXRlIHJlc3RhdXJhbnQnKTtcclxuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoJ3RleHQnLCAnTWFrZSBtZSBhcyB5b3VyIGZhdm9yaXRlIHJlc3RhdXJhbnQnKTtcclxuICB9IGVsc2Uge1xyXG4gICAgYnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2J0bi1mYXZvcml0ZS1mYWxzZScpO1xyXG4gICAgYnRuLmNsYXNzTGlzdC5hZGQoXCJidG4tZmF2b3JpdGUtdHJ1ZVwiKTtcclxuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCAnSSBhbSB5b3VyIGZhdm9yaXRlIHJlc3RhdXJhbnQnKTtcclxuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoJ3RleHQnLCAnSSBhbSB5b3VyIGZhdm9yaXRlIHJlc3RhdXJhbnQnKTtcclxuICB9XHJcbn1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRpbmcgdGhlIHJlc3RhdXJhbnQgaXNfZmF2b3JpdGUgc3RhdGUuXHJcbiAgICovXHJcbiAgLy8gaXNGYXZvcml0ZUNsaWNrZWQgPSAocmVzdGF1cmFudCwgbmV3U3RhdGUpID0+IHtcclxuICAvLyAgIC8vcmVzdGF1cmFudC5pc19mYXZvcml0ZSA9IG5ld1N0YXRlOyAgICAgIFxyXG4gIC8vICAgLy9EQkhlbHBlci51cGRhdGVJc0Zhdm9yaXRlKHJlc3RhdXJhbnQsIG5ld1N0YXRlKTtcclxuICAvLyAgIGNvbnNvbGUubG9nKFwib2xkIHN0YXRlLi5cIiwgcmVzdGF1cmFudFtcImlzX2Zhdm9yaXRlXCJdLCBcIi4ubmV3IHN0YXRlLi4uXCIsICFyZXN0YXVyYW50W1wiaXNfZmF2b3JpdGVcIl0pO1xyXG4gIC8vICAgY2hhbmdlQnRuRmF2b3JpdGVDbGFzcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgYnRuRmF2b3JpdGUtJHtyZXN0YXVyYW50LmlkfWApLCByZXN0YXVyYW50LmlzX2Zhdm9yaXRlKTtcclxuXHJcbiAgLy8gfVxyXG4iXSwiZmlsZSI6Im1haW4uanMifQ==
