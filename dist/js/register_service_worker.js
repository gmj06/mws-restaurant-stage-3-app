(function () {
  'use strict';

  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.register("service_worker.js").then(reg => {
    console.log("Service Worker Registered Successfully");
  }).catch(err => {
    console.log("Failed to register Service Worker, try again later", err);
  });
})();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlZ2lzdGVyX3NlcnZpY2Vfd29ya2VyLmpzIl0sIm5hbWVzIjpbIm5hdmlnYXRvciIsInNlcnZpY2VXb3JrZXIiLCJyZWdpc3RlciIsInRoZW4iLCJyZWciLCJjb25zb2xlIiwibG9nIiwiY2F0Y2giLCJlcnIiXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsWUFBWTtBQUNUOztBQUVBLE1BQUksQ0FBQ0EsU0FBUyxDQUFDQyxhQUFmLEVBQThCO0FBRTlCRCxFQUFBQSxTQUFTLENBQUNDLGFBQVYsQ0FBd0JDLFFBQXhCLENBQWlDLG1CQUFqQyxFQUFzREMsSUFBdEQsQ0FBMkRDLEdBQUcsSUFBSTtBQUM5REMsSUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksd0NBQVo7QUFDSCxHQUZELEVBRUdDLEtBRkgsQ0FFU0MsR0FBRyxJQUFJO0FBQ1pILElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLG9EQUFaLEVBQWtFRSxHQUFsRTtBQUNILEdBSkQ7QUFNSCxDQVhEIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICBpZiAoIW5hdmlnYXRvci5zZXJ2aWNlV29ya2VyKSByZXR1cm47XHJcblxyXG4gICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoXCJzZXJ2aWNlX3dvcmtlci5qc1wiKS50aGVuKHJlZyA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJTZXJ2aWNlIFdvcmtlciBSZWdpc3RlcmVkIFN1Y2Nlc3NmdWxseVwiKTtcclxuICAgIH0pLmNhdGNoKGVyciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJGYWlsZWQgdG8gcmVnaXN0ZXIgU2VydmljZSBXb3JrZXIsIHRyeSBhZ2FpbiBsYXRlclwiLCBlcnIpO1xyXG4gICAgfSk7XHJcblxyXG59KSgpOyJdLCJmaWxlIjoicmVnaXN0ZXJfc2VydmljZV93b3JrZXIuanMifQ==
