/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "tutorial/tutorial/model/models",
        "sap/ui/model/json/JSONModel",
        "sap/ui/model/odata/v4/ODataModel"
    ],
    function (UIComponent, Device, models, JSONModel, ODataModel) {
        "use strict";

        return UIComponent.extend("tutorial.tutorial.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */

            init() {
                UIComponent.prototype.init.apply(this, arguments);
                this.getRouter().initialize();

                this.setModel(models.createDeviceModel(), "device");

                let oJSONData = {
                    busy: false,
                    hasUIChanges : false,
					usernameEmpty : false,
                    order: 0
                };
                this.setModel(new JSONModel(oJSONData), "appView");

                this.setModel(new ODataModel({
                    serviceUrl: "odata/TripPinRESTierService/(S(id))/",
                    earlyRequests: true,
                    operationMode: "Server",
                    groupId: "$auto",
                    updateGroupId: "peopleGroup"
                }));
                 
                this.setModel(new JSONModel(), "jsonData");
            }
        });
    }
);