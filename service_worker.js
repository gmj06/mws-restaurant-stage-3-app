(function () {
    'use strict';

    let staticCacheName = "restaurant-v3";

    const urlsToCache = [
        "/",
        "/index.html",
        "/restaurant.html",
        "/css/styles.css",
        "/js/idb.js",
        "/js/idbhelper.js",
        "/js/dbhelper.js",
        "/js/main.js",
        "/js/restaurant_info.js",
        "/js/register_service_worker.js",
        "/manifest.json",
        "/img",
        "/img/tiles",
        "/img/banners",
        "/img/1.jpg",
        "/img/2.jpg",
        "/img/3.jpg",
        "/img/4.jpg",
        "/img/5.jpg",
        "/img/6.jpg",
        "/img/7.jpg",
        "/img/8.jpg",
        "/img/9.jpg",
        "/img/10.jpg",
    ];

    self.addEventListener("install", event => {
        event.waitUntil(
            caches.open(staticCacheName).then(cache => {
                return cache
                    .addAll(urlsToCache)
                    .catch(err => {
                        console.log("Cache Open failed in service worker " + err);
                    })
            })
        );
    });


    self.addEventListener("activate", event => {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.filter(cacheName => {
                        return cacheName.startsWith("restaurant-") &&
                            cacheName != staticCacheName
                    }).map(cacheName => {
                        return caches.delete(cacheName);
                    })
                )
            })
        );
    });

    self.addEventListener("fetch", event => {
        const cacheRequest = event.request;
        event.respondWith(
            caches.match(cacheRequest).then(resp => {
                if (resp) {
                    return resp;
                }
                var fetchRequest = event.request.clone();
                return fetch(fetchRequest).then(response => {
                    let responseClone = response.clone();
                    if (response.type === 'basic' || event.request.url.indexOf('https://maps.googleapis.com/maps/api/js') === 0) {
                        caches.open(staticCacheName).then(cache => {
                            return cache.put(event.request, responseClone)
                        })
                    }
                    return response;
                })
            }).catch(err => {
                console.log("err in fetch for " + event.request.url, err);
            })
        )
    });
})();