<?php

if (!function_exists('n3_tarefa3_apply_module8_fallback')) {
  function n3_tarefa3_apply_module8_fallback(): void
  {
    $module = $_SESSION['allterusN3Modulo8'] ?? $_SESSION['m8_00'] ?? null;
    if (!is_string($module) && !is_numeric($module)) {
      return;
    }

    $module = str_pad((string)$module, 10, '0');
    for ($index = 0; $index <= 9; $index++) {
      $name = 'm8_' . str_pad((string)$index, 2, '0', STR_PAD_LEFT);
      if (!isset($GLOBALS[$name]) || $GLOBALS[$name] === '' || $GLOBALS[$name] === null) {
        $GLOBALS[$name] = (int)($module[$index] ?? 0);
      }
    }
  }
}