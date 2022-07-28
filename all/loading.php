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
    $(".loader").fadeOut("slow");
  };
</script>