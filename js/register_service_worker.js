(function () {
    'use strict';

    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.register("service_worker.js").then(reg => {
        console.log("Service Worker Registered Successfully");
    }).catch(err => {
        console.log("Failed to register Service Worker, try again later", err);
    });

})();