sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
	"sap/m/MessageBox",
    "sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
    "sap/ui/model/json/JSONModel"
],
function (Controller, MessageToast, MessageBox, Sorter, Filter, FilterOperator, FilterType, JSONModel) {
    "use strict";

    return Controller.extend("tutorial.tutorial.controller.Main", {
        onInit() {
            let oJSONData = {
                order: 0
            };
            const oModel = new JSONModel(oJSONData);
            this.getView().setModel(oModel, "appView");
        },

        onRefresh() {
            const oBinding = this.byId("peopleList").getBinding("items");

            //.hasPendingChanges() is a method of sap.ui.model.odata.v4.ODataPropertyBinding, 
            //and returns boolean true or false.
            if(oBinding.hasPendingChanges()) {
                MessageBox.error(this._getText("refreshNotPossibleMessage"));
                return;
            }
            oBinding.refresh();
            MessageToast.show(this._getText("refreshSuccessMessage"));
        }, 

        //Get messages from the i18n model
        _getText(sTextId, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId, aArgs);
        }, 

        //The search is case sensitive and searches only in the currently loaded names
        onSearch() {
            const oView = this.getView(),
            sValue = oView.byId("searchField").getValue(),
            oFilter = new Filter("LastName", FilterOperator.Contains, sValue);

            //We apply the Filter (oFilter) via the .filter method, and then the binding automatically
            //retrieves filtered data from the OData V4 service and updates the table.
            oView.byId("peopleList").getBinding("items").filter(oFilter, FilterType.Application);
        },

        //Unlike the search, this sorts all names, even ones not currently displayed. WHY?
        onSort() {
            const oView = this.getView(),
            aStates = [undefined, "asc", "desc"],
            aStateTextIds = ["sortNone", "sortAscending", "sortDescending"]; //this leads to i18n messages
            let iOrder = oView.getModel("appView").getProperty("/order");
            let sMessage;

            iOrder = (iOrder + 1) % aStates.length; //cycles through 0, 1 and 2 on every click
            const sOrder = aStates[iOrder]; //cycles through the states on every click

            oView.getModel("appView").setProperty("/order", iOrder); //preserves the current number between clicks
            oView.byId("peopleList").getBinding("items").sort(sOrder && new Sorter("LastName", sOrder === "desc"));
            //If sOrder is truthy, new Sorter is created, which sorts by LastName and determines the order (if sOrder === "desc" returns true or false)

            sMessage = this._getText("sortMessage", [this._getText(aStateTextIds[iOrder])]); //this ties the i18n message together
            MessageToast.show(sMessage);

            //all in all, the sorter cycles between unsorted, (sorted by last name, ascending) and (sorted by last name, descending) each time it's clicked
        }
    });
});
