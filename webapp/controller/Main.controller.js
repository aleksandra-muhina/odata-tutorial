sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
	"sap/m/MessageBox",
    "sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
    "sap/ui/model/message/MessageModel",
    "sap/ui/model/json/JSONModel"
],
function (Controller, MessageToast, MessageBox, Sorter, Filter, FilterOperator, FilterType, MessageModel, JSONModel) {
    "use strict";

    return Controller.extend("tutorial.tutorial.controller.Main", {
        onInit() {
            this.oModel = this.getOwnerComponent().getModel("appView");
            const oMessageManager = sap.ui.getCore().getMessageManager();
            this.oMessageModel = oMessageManager.getMessageModel(); //get message manager and the model through it
            let oMessageModelBinding = this.oMessageModel.bindList("/", undefined, [], 
                new Filter("technical", FilterOperator.EQ, true)
            );
            //.bindList("sPath", default context, no sorters, filter for only technical messages)
            // default context means it uses the whole model instead of a part of it
            this.getView().setModel(this.oMessageModel, "message");
            oMessageModelBinding.attachChange(this.onMessageBindingChange, this); //add listener
            this._bTechnicalErrors = false;

            this.oDataModel = this.getOwnerComponent().getModel();
        },
        //event handler of Add User button
        onCreate(){
            const oList = this.byId("peopleList");
            const oBinding = oList.getBinding("items");
            const oContext = oBinding.create({ //oDataListBinding#create, creates a new entity in the list, returns the binding context of the new user
                "UserName" : "",
                "FirstName" : "",
                "LastName" : "",
                "Age" : "18" //this all adds initial data
            });

            this._setUIChanges(); //sets hasUIChanges to true, because there are pending changes
            this.oModel.setProperty("/usernameEmpty", true);

            oList.getItems().some(oItem => {
                if(oItem.getBindingContext() === oContext) { //using the returned context, we select and focus the row where the data can be entered
                    oItem.focus();
                    oItem.setSelected(true);
                    return true;
                }
            });
        },

        onDelete(){
            let oContext,
                sUserName;

            const oPeopleList = this.byId("peopleList"),
            oSelected = oPeopleList.getSelectedItem();
            //check if an item is selected
            if(oSelected) {
                oContext = oSelected.getBindingContext(); //if an item is selected, get the context...
                sUserName = oContext.getProperty("UserName");
                oContext.delete().then(() => { //...and delete it (oData delete method)
                    MessageToast.show(this._getText("deletionSuccessMessage", sUserName)); //promise resolve
                    //user is deleted upon clicking Save
                }, 
                (oError) => {
                    if(oContext === oPeopleList.getSelectedItem().getBindingContext()){
                        this._setDetailArea(oContext); //if an item is restored after getting deleted, show it again in the detail area
                    }
                    this._setUIChanges();
                    if(oError.canceled) {
                        MessageToast.show(this._getText("deletionRestoredMessage", sUserName)); //promise reject
                        return; //this results in the user being brought back to the table, upon clicking Cancel
                    }
                    MessageBox.error(oError.message + ": " + sUserName);
                });
                this._setDetailArea();
                this._setUIChanges(true); //pending change, save btn is active
            }
        },
        //checks input in all fields, extra check for UserName to make sure it's not empty
        onInputChange(oEvent) {
            if(oEvent.getParameter("escPressed")) {
                this._setUIChanges();
            } else {
                this._setUIChanges(true);
                if(oEvent.getSource().getParent().getBindingContext().getProperty("UserName")) {
                    this.oModel.setProperty("/usernameEmpty", false);
                }
            }
        },
        //retrieve the context of the selected item and pass it to _setDetailArea
        onSelectionChange(oEvent) {
            this._setDetailArea(oEvent.getParameter("listItem").getBindingContext());
        },

        onSave() {
            const fnSuccess = () => {
                this._setBusy(false); //release the ui
                MessageToast.show(this._getText("changesSentMessage"));
                this._setUIChanges(false); //no more pending changes
            };

            const fnError = oError => {
                this._setBusy(false);
                this._setUIChanges(false);
                MessageBox.error(oError.message); //displays an error dialog with the error.message from the promise
            };

            this._setBusy(true); //locks the ui until the submitBatch is resolved
            this.oDataModel.submitBatch("peopleGroup").then(fnSuccess, fnError); //submitBatch is an oDataModel method, which returns a promise
            this._bTechnicalErrors = false; //resetting technical errors on a new save

        },
        //discard pending changes
        onResetChanges() {
            this.byId("peopleList").getBinding("items").resetChanges();
            this._bTechnicalErrors = false;
            this._setUIChanges(); //check for pending changes, enable the header, hide the footer
        },
        //revert all changes even if they were saved 
        //currently only works on the second click, but there doesn't seem to be an error, so why?
        //maybe this is intended, the tutorial said it only resets the data, so the refresh button needs to be used to visualize the data
        onResetDataSource() {
            let oOperation = this.oDataModel.bindContext("/ResetDataSource(...)"); //deferred operation, the (...) marks it as deferred

            oOperation.invoke().then(() => {
                this.oDataModel.refresh();
                MessageToast.show(this._getText("sourceResetSuccessMessage"));
            },
            (oError) => {
                MessageBox.error(oError.message);
            });
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
            let iOrder = this.oModel.getProperty("/order");
            let sMessage;

            iOrder = (iOrder + 1) % aStates.length; //cycles through 0, 1 and 2 on every click
            const sOrder = aStates[iOrder]; //cycles through the states on every click

            this.oModel.setProperty("/order", iOrder); //preserves the current number between clicks
            oView.byId("peopleList").getBinding("items").sort(sOrder && new Sorter("LastName", sOrder === "desc"));
            //If sOrder is truthy, new Sorter is created, which sorts by LastName and determines the order (if sOrder === "desc" returns true or false)

            sMessage = this._getText("sortMessage", [this._getText(aStateTextIds[iOrder])]); //this ties the i18n message together
            MessageToast.show(sMessage);

            //all in all, the sorter cycles between unsorted, (sorted by last name, ascending) and (sorted by last name, descending) each time it's clicked
        },

        onMessageBindingChange(oEvent) {
            const aContext = oEvent.getSource().getContexts(); //only technical messages should have binding context, because of the filter
            let aMessages,
                bMessageOpen = false;
            
            if(bMessageOpen || !aContext.length) { //do not open a dialog, if there is a dialog already present or if there are no technical messages
                return;
            }

            //extract the technical messages
            aMessages = aContext.map(oContext => { //map all messages in an array
                return oContext.getObject();
            });
            sap.ui.getCore().getMessageManager().removeMessages(aMessages);

            this._setUIChanges(true); //pending changes are true, still have the option to save or discard
            this._bTechnicalErrors = true; //indicates that technical errors are present
            MessageBox.error(aMessages[0].message, { //get the first technical error and display it as a message
                id: "serviceErrorMessageBox",
                onClose: () => {
                    bMessageOpen = false; //message closes and allows new messages
                }
            });
            bMessageOpen = true;
        },

        //Get messages from the i18n model
        _getText(sTextId, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId, aArgs);
        },
        //check of there are unsaved/unapplied changes
        _setUIChanges(bHasUIChanges) {
            if(this._bTechnicalErrors) {
                //if there is a technical error, we set this to true
                bHasUIChanges = true;
            } else if(bHasUIChanges === undefined){
                bHasUIChanges = this.oDataModel.hasPendingChanges(); //this is an oData boolean check
            }
            this.oModel.setProperty("/hasUIChanges", bHasUIChanges); 
        },

        _setBusy(bIsBusy) { //sets the App View to busy
            this.oModel.setProperty("/busy", bIsBusy);
        },
        //set Detail view
        _setDetailArea(oUserContext) {
            const oDetailArea = this.byId("detailArea"),
                oLayout = this.byId("defaultLayout"),
                oSearchField = this.byId("searchField");

            let oOldContext;

            if(!oDetailArea) {
                return; //check if there is a detail view and return if there is none
            }

            oOldContext = oDetailArea.getBindingContext(); //get the current/about-to-be-old context
            if(oOldContext) {
                oOldContext.setKeepAlive(false); //removes old context
            }
            if(oUserContext) { //saves the new context and keeps it until it becomes old context
                oUserContext.setKeepAlive(true,
                    this._setDetailArea.bind(this) //.bind(this) makes sure that when this._setDetailArea is called from here, "this" still refers to the controller
                ); 
            }

            oDetailArea.setBindingContext(oUserContext || null); 

            oDetailArea.setVisible(!!oUserContext); //turn to boolean to set visibility
            oLayout.setSize(oUserContext ? "60%" : "100%");
            oLayout.setResizable(!!oUserContext); //make the detail view resizable
            oSearchField.setWidth(oUserContext ? "40%" : "30%");
        }
    });
});
