sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
	"sap/m/MessageBox"
],
function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("tutorial.tutorial.controller.Main", {
        onInit() {

        },

        onRefresh() {
            const oBinding = this.byId("peopleList").getBinding("items");

            //.hasPendingChanges() is a method of sap.ui.model.odata.v4.ODataPropertyBinding, 
            //and returns boolean true or false
            if(oBinding.hasPendingChanges()) {
                MessageBox.error(this._getText("referenceNotPossibleMessage"));
                return;
            }
            oBinding.refresh();
            MessageToast.show(this._getText("refreshSuccessMessage"));
        }, 

        //Get messages from the i18n model
        _getText(sTextId) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId);
        }
    });
});
