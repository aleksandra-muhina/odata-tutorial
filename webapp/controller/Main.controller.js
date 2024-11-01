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
            this.oDataModel = this.getOwnerComponent().getModel(); 
            this.oData = this.getOwnerComponent().getModel("jsonData"); 

            const oMessageManager = sap.ui.getCore().getMessageManager();
            this.oMessageModel = oMessageManager.getMessageModel(); 
            let oMessageModelBinding = this.oMessageModel.bindList("/", undefined, [], 
                new Filter("technical", FilterOperator.EQ, true)
            );
            this.getView().setModel(this.oMessageModel, "message");
            oMessageModelBinding.attachChange(this.onMessageBindingChange, this);

            this._bTechnicalErrors = false;
            this.oNewPerson;
        },

        onAfterRendering() {
            this.oDataPeopleList = this.oDataModel.bindList("/People");
            this.loadData();
        },

        loadData() {
            this.oDataPeopleList.requestContexts().then(
                (aContexts) => {
                    let aData = aContexts.map(oContext => {
                        let oPerson = oContext.getObject();
                        oPerson.context = oContext;
                        return oPerson;
                    });
                    this.oData.setData(aData);
                },
                (oError) => {
                    MessageBox.error(oError.message);
                }
            );
        },
        
        onCreate(){
            const oList = this.byId("peopleList");
            let aItems, oNewItem;
            let aData = this.oData.getData();

            const oNewEntry = {
                "UserName" : "",
                "FirstName" : "",
                "LastName" : "",
                "Age" : "18"
            };

            aData.unshift(oNewEntry);
            this.oData.setData(aData);

            this.oNewPerson = this.oDataPeopleList.create(oNewEntry);
            
            aItems = oList.getItems();
            oNewItem = aItems[0];
            if (oNewItem) {
                oNewItem.setSelected(true);
                oNewItem.focus();
            }

            this._setUIChanges(); 
            this.oModel.setProperty("/usernameEmpty", true);
        },

        onDelete(){
            let oContext,
                sUserName;
            const oPeopleList = this.byId("peopleList"),
            oSelected = oPeopleList.getSelectedItem();

            if(oSelected) {
                oContext = oSelected.getBindingContext("jsonData"); 
                sUserName = oContext.getProperty("UserName");
                let aData = this.oData.getProperty("/");
                const nIndex = aData.findIndex(person => {
                    return person.UserName === sUserName;
                });

                aData.splice(nIndex, 1);
                this.oData.setProperty("/", aData);

                this.oDataPeopleList.requestContexts().then(
                    (aContexts) => {
                        const oPerson = aContexts.find(context => context.getProperty("UserName") === sUserName);
                        oPerson.delete().then(() => { 
                            MessageToast.show(this._getText("deletionSuccessMessage", sUserName));
                        }, 
                        (oError) => {
                            if(oContext === oPeopleList.getSelectedItem().getBindingContext("jsonData")){
                                this._setDetailArea(oContext);
                            }
                            this._setUIChanges();
                            if(oError.canceled) {
                                MessageToast.show(this._getText("deletionRestoredMessage", sUserName));
                                return;
                            }
                            MessageBox.error(oError.message + ": " + sUserName);
                        });
                    },
                    (oError) => {
                        MessageBox.error(oError.message);
                    });

                this._setDetailArea(oContext);
                this._setUIChanges(true);
                
            }
        },

        /* Input Change updates data in the local "jsonData" model and in the oData service */
        
        onInputChange(oEvent) {
            const oDataContext = oEvent.getSource().getParent().getBindingContext("jsonData").getObject().context,
            sNewValue = oEvent.getParameter("value"),
            oContext = oEvent.getSource().getBindingContext("jsonData"),
            sPath = oEvent.getSource().getBinding("value").getPath();

            oContext.setProperty(sPath, sNewValue);
            
            if(oDataContext) {
                const oBoundContext = this.oDataModel.bindContext("", oDataContext).getBoundContext();
                oBoundContext.setProperty(`${sPath}`, `${sNewValue}`);
            } else if (this.oNewPerson){
                this.oNewPerson.setProperty(`${sPath}`, `${sNewValue}`);
            } else {
                MessageBox.error("Context could not be retrieved: " + oError.message);
            }

            if(oEvent.getParameter("escPressed")) {
                this._setUIChanges();
            } else {
                this._setUIChanges(true);
                if(oContext.getProperty("UserName") === "") {
                    this.oModel.setProperty("/usernameEmpty", true);
                } else {
                    this.oModel.setProperty("/usernameEmpty", false)
                }
            }
        },

        /* onSave sends all changes to the oData service in a batch request */

        onSave() {
            const fnSuccess = () => {
                this._setBusy(false);
                MessageToast.show(this._getText("changesSentMessage"));
                this._setUIChanges(false);
            };

            const fnError = oError => {
                this._setBusy(false);
                this._setUIChanges(false);
                MessageBox.error(oError.message);
            };

            this._setBusy(true);
            this.oDataModel.submitBatch("peopleGroup").then(fnSuccess, fnError);
        },

        onResetChanges() {
            this.oDataPeopleList.resetChanges();
            this.loadData();
            this._bTechnicalErrors = false;
            this._setUIChanges();
        },
        
        onResetDataSource() {
            const oOperation = this.oDataModel.bindContext("/ResetDataSource(...)");

            oOperation.invoke().then(() => {
                MessageToast.show(this._getText("sourceResetSuccessMessage"));
            },
            (oError) => {
                MessageBox.error(oError.message);
            });
        },

        onRefresh() {
            if(this.oDataPeopleList.hasPendingChanges()) {
                MessageBox.error(this._getText("refreshNotPossibleMessage"));
                return;
            } else {
                this.oDataPeopleList.refresh();
                MessageToast.show(this._getText("refreshSuccessMessage"));
            }
        },  

        /* onSelectionChange opens the details panel */

        onSelectionChange(oEvent) {
            this._setDetailArea(oEvent.getParameter("listItem").getBindingContext("jsonData"));
        },

        /* The search is case sensitive and currently unly searches by LastName */

        onSearch() {
            const oView = this.getView(),
            sValue = oView.byId("searchField").getValue(),
            oFilter = new Filter("LastName", FilterOperator.Contains, sValue);
            oView.byId("peopleList").getBinding("items").filter(oFilter, FilterType.Application);
        },

        /* The sort button changes sorting options when clicked, and sorts by LastName */

        onSort() {
            const oView = this.getView(),
            aStates = [undefined, "asc", "desc"],
            aStateTextIds = ["sortNone", "sortAscending", "sortDescending"];
            let iOrder = this.oModel.getProperty("/order");
            let sMessage;

            iOrder = (iOrder + 1) % aStates.length;
            const sOrder = aStates[iOrder];

            this.oModel.setProperty("/order", iOrder);
            oView.byId("peopleList").getBinding("items").sort(sOrder && new Sorter("LastName", sOrder === "desc"));

            sMessage = this._getText("sortMessage", [this._getText(aStateTextIds[iOrder])]);
            MessageToast.show(sMessage);
        },

        /* Message Filter */

        onMessageBindingChange(oEvent) {
            const aContext = oEvent.getSource().getContexts();
            let aMessages,
                bMessageOpen = false;
            
            if(bMessageOpen || !aContext.length) {
                return;
            }
            aMessages = aContext.map(oContext => {
                return oContext.getObject();
            });
            sap.ui.getCore().getMessageManager().removeMessages(aMessages);

            this._setUIChanges(true);
            this._bTechnicalErrors = true;
            MessageBox.error(aMessages[0].message, {
                id: "serviceErrorMessageBox",
                onClose: () => {
                    bMessageOpen = false;
                }
            });
            bMessageOpen = true;
        },

        _getText(sTextId, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId, aArgs);
        },

        /* _setUIChanges determines the visibility of the footer toolbar with the Save and Cancel options */

        _setUIChanges(bHasUIChanges) {
            if(this._bTechnicalErrors) {
                bHasUIChanges = true;
            } else if(bHasUIChanges === undefined){
                bHasUIChanges = this.oDataModel.hasPendingChanges();
            }
            this.oModel.setProperty("/hasUIChanges", bHasUIChanges); 
        },

        _setBusy(bIsBusy) {
            this.oModel.setProperty("/busy", bIsBusy);
        },

        /* Creates the detail area */
        
        _setDetailArea(oUserContext) {
            const oDetailArea = this.byId("detailArea"),
                oLayout = this.byId("defaultLayout"),
                oSearchField = this.byId("searchField");

            if(!oDetailArea) {
                return;
            }

            oDetailArea.setBindingContext(oUserContext, "jsonData"); 
            oDetailArea.setVisible(!!oUserContext);
            oLayout.setSize(oUserContext ? "60%" : "100%");
            oLayout.setResizable(!!oUserContext);
            oSearchField.setWidth(oUserContext ? "40%" : "30%");
        }
    });
});
