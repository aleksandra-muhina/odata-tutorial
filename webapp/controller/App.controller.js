sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function(BaseController) {
      "use strict";
  
      return BaseController.extend("tutorial.tutorial.controller.App", {
        onInit() {
          this.oModel = this.getOwnerComponent().getModel("appView");
        }
      });
    }
  );
  