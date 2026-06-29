(function () {
  document.addEventListener('shown.bs.modal', function () {
    document.querySelectorAll('.modal-backdrop.atd-modern-backdrop').forEach(function (backdrop) {
      backdrop.remove();
    });
  });
})();
