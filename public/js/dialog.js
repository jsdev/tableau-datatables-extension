'use strict';

var uiSettings = [
   'compact',
  'hover',
  'nowrap',
  'order-column',
  'row-border',
  'stripe',
  'include-table-name'
];

var pluginSettings = [
  'export-clipboard',
  'export-excel',
  'export-csv',
  'export-pdf',
  'export-print'
];

(function () {

  $(document).ready(function () {

  });
  
  document.addEventListener('DOMContentLoaded', wireExtension, false);

  function wireExtension () {
      tableau.extensions.initializeDialogAsync().then(function (openPayload) {
        buildDialog();
      });
  }

  // We bulid the dialogue box and ensure that settings are read from the
  // UI Namespace and the UI is updated.
  function buildDialog() {
    var worksheetName = tableau.extensions.settings.get("worksheet");

    if (worksheetName != undefined) {
      // We restore the look and feel and plugin settings.
      [].concat(uiSettings).concat(pluginSettings).forEach(setting => {
        document.getElementById(setting).checked = tableau.extensions.settings.get(setting) === "Y";
      });
    }

    // Populate the worksheet drop down with a list of worksheets.
    // Generated at the time of opening the dialogue.
    let dashboard = tableau.extensions.dashboardContent.dashboard;
    dashboard.worksheets.forEach(function (worksheet) {
      $("#selectWorksheet").append("<option value='" + worksheet.name + "'>" + worksheet.name + "</option>");
    });

    // Add the column orders it exists
    var column_order = tableau.extensions.settings.get("column_order");
    if (column_order != undefined && column_order.length > 0) {
      var column_names_array = tableau.extensions.settings.get("column_names").split("|");
      var column_order_array = tableau.extensions.settings.get("column_order").split("|");
      $("#sort-it ol").text("");
      for (var i = 0; i < column_names_array.length; i++) {
        //alert(column_names_array[i] + " : " + column_order_array[i]);
        $("#sort-it ol").append("<li><div class='input-field'><input id='" + column_names_array[i] + "' type='text' col_num=" + column_order_array[i] + "><label for=" + column_names_array[i] + "'>" + column_names_array[i] + "</label></div></li>");

        // add option to "number of columns for row header" dropdown
        $('#col-count-row-header').append('<option value="'+(i+1)+'" '+
          (tableau.extensions.settings.get('col-count-row-header') == i+1 ? 'selected' : '')+'>'+(i+1)+'</option>');
      }
      $('#sort-it ol').sortable({
        onDrop: function (item) {
          $(item).removeClass("dragged").removeAttr("style");
          $("body").removeClass("dragging");
        }
      });
    }

    // Initialise the tabs, select and attach functions to buttons.
    $("#selectWorksheet").val(tableau.extensions.settings.get("worksheet"));
    $('#selectWorksheet').on('change', '', function (e) {
      columnsUpdate();
    });
    $("#underlying").val(tableau.extensions.settings.get("underlying"));
    $('#underlying').on('change', '', function (e) {
      columnsUpdate();
    });
    $("#max_no_records").val(tableau.extensions.settings.get("max_no_records"));
    $('select').formSelect();
    $('.tabs').tabs();
    $('#closeButton').click(closeDialog);
    $('#saveButton').click(saveButton);
    // $('#resetButton').click(resetButton);
  }

  function columnsUpdate() {
    var worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
    var worksheetName = $("#selectWorksheet").val();
    var underlying = $("#underlying").val();

    // Get the worksheet object for the specified names.
    var worksheet = worksheets.find(sheet => sheet.name === worksheetName);

    // If underlying is 1 then get Underlying, else get Summary. Note that the columns will
    // look different if you have summary or underlying.
    if (underlying == 1) {
      // Note that for our purposes and to speed things up we only want 1 record.
      worksheet.getUnderlyingDataAsync({ maxRows: 1 }).then(function (sumdata) {
        var worksheetColumns = sumdata.columns;
        // This blanks out the column list
        $("#sort-it ol").text("");
        var counter = 1;
        worksheetColumns.forEach(function (current_value) {
          // For each column we add a list item with an input box and label.
          // Note that this is based on materialisecss.
          $("#sort-it ol").append("<li><div class='input-field'><input id='" + current_value.fieldName + "' type='text' col_num=" + counter + "><label for=" + current_value.fieldName + "'>" + current_value.fieldName + "</label></div></li>");
          counter++;
        });
      });
    } else {
      // Note that for our purposes and to speed things up we only want 1 record.
      worksheet.getSummaryDataAsync({ maxRows: 1 }).then(function (sumdata) {
        var worksheetColumns = sumdata.columns;
        // This blanks out the column list
        $("#sort-it ol").text("");
        var counter = 1;
        worksheetColumns.forEach(function (current_value) {
          // For each column we add a list item with an input box and label.
          // Note that this is based on materialisecss.
          $("#sort-it ol").append("<li><div class='input-field'><input id='" + current_value.fieldName + "' type='text' col_num=" + counter + "><label for=" + current_value.fieldName + "'>" + current_value.fieldName + "</label></div></li>");
          counter++;
        });
      });
    }
    // Sets up the sortable elements for the columns list.
    // https://jqueryui.com/sortable/
    $('#sort-it ol').sortable({
      onDrop: function (item) {
        $(item).removeClass("dragged").removeAttr("style");
        $("body").removeClass("dragging");
      }
    });
  }

  // This function closes the dialog box without.
  function closeDialog() {
    tableau.extensions.ui.closeDialog("10");
  }

  // This function saves then settings and then closes then closes the dialogue
  // window.
  function saveButton() {

    // Data settings
    tableau.extensions.settings.set("worksheet", $("#selectWorksheet").val());
    tableau.extensions.settings.set("max_no_records", $("#max_no_records").val());
    tableau.extensions.settings.set("underlying", $("#underlying").val());

    // Create a string which will hold the datatable.net css options called tableClass.
    // Also saves the individual Y and N so that we can restore the settings when you
    // open the configuration dialogue.
    // https://datatables.net/examples/styling/
    var tableClass = "";

    uiSettings.forEach(setting => {
      if (document.getElementById(setting).checked) {
        tableClass += ` ${setting}`;
        tableau.extensions.settings.set(setting, "Y");
      } else {
        tableau.extensions.settings.set(setting, "N");
      }
    });

    tableau.extensions.settings.set("table-classes", tableClass);

    // Saves the individual Y and N for the plugin settings so that we can restore this
    // when you open the configuration dialogue.
    // https://datatables.net/extensions/buttons/examples/html5/simple.html

    pluginSettings.forEach(setting => {
      tableau.extensions.settings.set(
        setting,
        document.getElementById(setting).checked ? "Y" : "N"
      );
    });

    // This gets the column information and saves the column order and column name.
    // For example, if you have a data source with three columns and then reorder
    // there so that you get the third, first and then second column, you would get: 
    // --- column_order will look like: 3|1|2
    // --- column_name will look like: SUM(Sales)|Country|Region
    var column_order = "";
    var column_name = "";
    var counter = 0;
    $("#sort-it").find("input").each(function (column) {
      // This handles the column order
      if (counter == 0) {
        column_order = $(this).attr("col_num");
      } else {
        column_order = column_order + "|" + $(this).attr("col_num");
      }
      // This handles the column name.
      if (counter == 0) {
        if ($(this).val().length > 0) {
          column_name = $(this).val();
        } else {
          column_name = $(this).attr("id");
        }
      } else {
        if ($(this).val().length > 0) {
          column_name = column_name + "|" + $(this).val();
        } else {
          column_name = column_name + "|" + $(this).attr("id");
        }
      }
      counter++;
    });

    // row header setting
    tableau.extensions.settings.set("col-count-row-header", $('#col-count-row-header').val());

    // We save the column order and column name variables in the UI Namespace.
    tableau.extensions.settings.set("column_order", column_order);
    tableau.extensions.settings.set("column_names", column_name);

    // Call saveAsync to save the settings before calling closeDialog.
    tableau.extensions.settings.saveAsync().then((currentSettings) => {
      tableau.extensions.ui.closeDialog("10");
    });
  }
})();
