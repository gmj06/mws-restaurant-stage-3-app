let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  const imageurl = DBHelper.imageUrlForRestaurant(restaurant, "banners");
  const imgparts = imageurl.split(".");
  const imgurl1x = imgparts[0] + "-500w_1x." + imgparts[1];
  const imgurl2x = imgparts[0] + "-800w_2x." + imgparts[1];
  image.src = imgurl1x;
  image.srcset = `${imgurl1x} 500w, ${imgurl2x} 800w`;
  image.alt = restaurant.name + " banner image";
  

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  //fillReviewsHTML();
  DBHelper.fetchReviewsByRestaurantId(restaurant.id, fillReviewsHTML);
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {  
  const title = document.createElement('h3');
  title.innerHTML = 'Hours of Operation';
    
  const hours = document.getElementById('restaurant-hours');
  hours.insertBefore(title, hours.childNodes[0]);
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key.trim();
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key].trim();
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
// fillReviewsHTML = (error, reviews = self.restaurant.reviews) => {
  fillReviewsHTML = (error, reviews) => {
  self.restaurant.reviews = reviews;

  if(error){
    console.log("fillReviewsHTML...", error);    
  }
  const container = document.getElementById('reviews-container');
  const reviewsHeading = document.createElement('div');
  reviewsHeading.setAttribute('id', 'reviews-container-heading');
  container.appendChild(reviewsHeading);

  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  reviewsHeading.appendChild(title);

  const btnAddAReview = document.createElement('button');
  btnAddAReview.innerHTML = "Add a Review";
  btnAddAReview.setAttribute('id', 'add-review-btn');
  btnAddAReview.onclick = () => {
    newReviewformReset();
    const newReviewForm = document.getElementById('add-review-container');

    if(btnAddAReview.innerHTML == 'Add a Review'){
      newReviewForm.style.display = 'block';  
      btnAddAReview.innerHTML = "Hide Add Review";
      reviewsHeading.appendChild(newReviewForm);
    }else{
      btnAddAReview.innerHTML = "Add a Review";
      newReviewForm.style.display = 'none';
    }
  }
  reviewsHeading.appendChild(btnAddAReview);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');

  if(!window.navigator.onLine){
    const offlineLabel = document.createElement('p');
    offlineLabel.innerHTML = "Offline Mode";
    offlineLabel.classList.add('offline-mode-label');
    li.classList.add('review-offline-mode');
    li.appendChild(offlineLabel);
  }

  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  let timestamp = new Date(review.createdAt);
  let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  
  date.innerHTML = timestamp.toLocaleDateString("en-US", options);
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

clearErrorMessage = (event, id) => {
  if(event.keyCode === 13){
    event.preventDefault();
  }
  document.getElementById(`${id}-error`).innerHTML = "";
}

newReviewformReset = () => {
  document.getElementById('new-review-form').reset();
  document.getElementById("reviewer-name-error").innerHTML = "";
  document.getElementById("reviewer-comments-error").innerHTML = "";  
}

addReviewHTMLToDOM = (reviewObj) => { 
  const ul = document.getElementById('reviews-list');
  ul.insertBefore(createReviewHTML(reviewObj), ul.childNodes[0]);
} 

addNewReview = (event) => {
  //event.preventDefault();
  const reviewAuthor = document.getElementById("reviewer-name").value;
  //const reviewerRatingSelect = document.getElementById("reviewer-rating-select");
  //const reviewerRating = reviewerRatingSelect.options[reviewerRatingSelect.selectedIndex].value;
  const reviewerRating = document.querySelector("#reviewer-rating-select option:checked").value;
  const reviewerComments = document.getElementById("reviewer-comments").value;
  document.getElementById("reviewer-name-error").innerHTML = "";
  document.getElementById("reviewer-comments-error").innerHTML = "";
 
  if(reviewAuthor == ""){
    document.getElementById("reviewer-name-error").innerHTML = "Please enter your name";
    return false;    
  }

  if(reviewerComments == ""){
    document.getElementById("reviewer-comments-error").innerHTML = "Please enter your comments";
    return false;    
  }
 
  document.getElementById("add-review-submit").disabled = true;
  console.log(self.restaurant.id, reviewAuthor , reviewerRating, reviewerComments);
  const reviewObj = {
    "restaurant_id": parseInt(self.restaurant.id),
    "name": reviewAuthor,
    "rating": parseInt(reviewerRating),
    "comments": reviewerComments
  };

  const IDBobj = {
    "restaurant_id": parseInt(self.restaurant.id),
    "name": reviewAuthor,
    "rating": parseInt(reviewerRating),
    "comments": reviewerComments,
    "createdAt": new Date()
  }

 // console.log('robj..', robj);
  DBHelper.addNewReview(self.restaurant.id, reviewObj, (error, review) => {
    if(error){
      console.log("Unable to add new review to server", error);
    }
    document.getElementById("add-review-submit").disabled = false;
  });
  //DBHelper.addNewReview(self.restaurant.id, reviewObj);
  addReviewHTMLToDOM(IDBobj);
  newReviewformReset();
  
}