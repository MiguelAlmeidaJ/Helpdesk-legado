<style>
  .loader {
    position: fixed;
    left: 0px;
    top: 0px;
    width: 100%;
    height: 100%;
    z-index: 9999;
    background: url('../img/preloader_1.gif') 50% 50% no-repeat white;
  }
</style>
<div id="loader" class="loader"></div>
<script>
  window.onload = function(){
    var loader = document.querySelector(".loader");
    if (!loader) {
      return;
    }

    if (window.jQuery) {
      jQuery(loader).fadeOut("slow");
      return;
    }

    loader.style.transition = "opacity .25s ease";
    loader.style.opacity = "0";
    window.setTimeout(function(){
      loader.style.display = "none";
    }, 250);
  };
</script>
