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
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
                // set the json model
                let oJSONData = {
                    busy: false,
                    hasUIChanges : false,
					usernameEmpty : false,
                    order: 0
                };
                this.setModel(new JSONModel(oJSONData), "appView");

                this.setModel(new ODataModel({
                    serviceUrl: "odata/TripPinRESTierService/(S(id))/",
                    odataVersion: "4.0",
                    // autoExpandSelect: true, //adds Expand and Select to requests, allows to only fetch necessary data, and also messes with the proxy for some reason
                    earlyRequests: true, //fetches data as early as possible, reducing load time 
                    operationMode: "Server", // conducts filtering and sorting on the server side 
                    groupId: "$auto",
                    updateGroupId: "peopleGroup"
                }));
                 
                this.setModel(new JSONModel(), "jsonData");
            }
        });
    }
);