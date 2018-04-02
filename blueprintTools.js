var Failure = (function () {
    function Failure(immediateReason, innerFailure, data) {
        this.immediateReason = immediateReason;
        this.innerFailure = innerFailure;
        this.data = data;
    }
    Failure.prototype.toString = function () {
        return this.immediateReason + (this.innerFailure ? "\nInner failure:\n" + this.innerFailure.toString().replace(/^(?!\s*$)/mg, "   ") : "");
    };
    return Failure;
}());
var BlueprintUtility = (function () {
    function BlueprintUtility() {
    }
    BlueprintUtility.loadFromString = function (blueprintString) {
        try {
            if (!blueprintString.startsWith(this.BLUEPRINT_VERSION_BYTE_CHARACTER))
                return new Failure("Unexpected blueprint string version byte different than \"0\"");
            var data = atob(blueprintString.substr(1));
            var bytes = new Uint8Array(data.split('').map(function (x) { return x.charCodeAt(0); }));
            var jsonInputBP = pako.inflate(bytes, { to: "string" });
            return JSON.parse(jsonInputBP);
        }
        catch (e) {
            return new Failure(e.toString());
        }
    };
    BlueprintUtility.generateBlueprintString = function (data) {
        try {
            return this.BLUEPRINT_VERSION_BYTE_CHARACTER + btoa(pako.deflate(JSON.stringify(data), { to: "string" }));
        }
        catch (e) {
            return new Failure(e.toString());
        }
    };
    BlueprintUtility.BLUEPRINT_VERSION_BYTE_CHARACTER = "0";
    return BlueprintUtility;
}());
var BlueprintAnchorChanger = (function () {
    function BlueprintAnchorChanger() {
    }
    BlueprintAnchorChanger.loadBlueprint = function () {
        var inputBP = BlueprintUtility.loadFromString(document.getElementById("in").value);
        if (inputBP instanceof Failure) {
            document.getElementById("out").value = "Error parsing input blueprint:\n" + inputBP.toString();
            return;
        }
        this._blueprintData = inputBP;
        var entitiesAndTiles = (inputBP.blueprint.entities || []).concat(inputBP.blueprint.tiles || []);
        if (entitiesAndTiles.length === 0) {
            document.getElementById("out").value = "Blueprint is empty. I don't think you can even make empty blueprints without manual editing...";
            return;
        }
        this._blueprintCorners = entitiesAndTiles.reduce(function (p, c) {
            return [
                [
                    Math.min(p[0][0], c.position.x),
                    Math.max(p[0][1], c.position.x)
                ],
                [
                    Math.min(p[1][0], c.position.y),
                    Math.max(p[1][1], c.position.y)
                ]
            ];
        }, [[Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY], [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]]);
        var radioButtons = document.getElementsByClassName("anchor");
        Array.prototype.forEach.call(radioButtons, function (e) { e.disabled = false; });
        document.getElementById("setanchor").disabled = false;
    };
    BlueprintAnchorChanger.generateAnchoredBlueprint = function () {
        var radioButtons = document.getElementsByClassName("anchor");
        var anchorPoint = 4;
        Array.prototype.forEach.call(radioButtons, function (e) { if (e.checked)
            anchorPoint = +e.getAttribute("position"); });
        var anchor = [
            {
                0: this._blueprintCorners[0][0],
                1: (this._blueprintCorners[0][1] - this._blueprintCorners[0][0]) / 2,
                2: this._blueprintCorners[0][1],
            }[anchorPoint % 3],
            {
                0: this._blueprintCorners[1][0],
                1: (this._blueprintCorners[1][1] - this._blueprintCorners[1][0]) / 2,
                2: this._blueprintCorners[1][1],
            }[~~(anchorPoint / 3)]
        ];
        anchor = anchor.map(function (e) { return Math.round(e / 2) * 2; });
        var entitiesAndTiles = (this._blueprintData.blueprint.entities || []).concat(this._blueprintData.blueprint.tiles || []);
        entitiesAndTiles.forEach(function (e) { e.position.x -= anchor[0]; e.position.y -= anchor[1]; });
        document.getElementById("out").value = BlueprintUtility.generateBlueprintString(this._blueprintData).toString();
        Array.prototype.forEach.call(radioButtons, function (e) { e.disabled = true; });
        document.getElementById("setanchor").disabled = true;
    };
    return BlueprintAnchorChanger;
}());
function createRequesterBP() {
    var inputBP = BlueprintUtility.loadFromString(document.getElementById("in").value);
    if (inputBP instanceof Failure) {
        document.getElementById("out").value = "Error parsing input blueprint:\n" + inputBP.toString();
        return;
    }
    try {
        var inputEntities_1 = {};
        var itemList = (inputBP.blueprint.entities || []).concat(inputBP.blueprint.tiles || []);
        itemList.forEach(function (e) {
            var _a = {
                "curved-rail": ["rail", 4],
                "straight-rail": ["rail", 1],
                "stone-path": ["stone-brick", 1],
                "hazard-concrete-left": ["hazard-concrete", 1],
                "hazard-concrete-right": ["hazard-concrete", 1],
                "refined-hazard-concrete-left": ["refined-hazard-concrete", 1],
                "refined-hazard-concrete-right": ["refined-hazard-concrete", 1]
            }[e.name] || [e.name, 1], baseEntityName = _a[0], baseEntityCost = _a[1];
            inputEntities_1[baseEntityName] = (inputEntities_1[baseEntityName] || 0) + baseEntityCost;
            if ((function (t) { return true; })(e) && e.items)
                for (var item in e.items)
                    inputEntities_1[item] = (inputEntities_1[item] || 0) + e.items[item];
        });
        var inputEntitiesList = Object.entries(inputEntities_1);
        var requesterChestBPBase = {
            entity_number: 1,
            name: 'logistic-chest-requester',
            position: {
                x: 0,
                y: 0
            },
            request_filters: []
        };
        var outputBase = {
            blueprint: {
                icons: [
                    {
                        signal: {
                            type: 'item',
                            name: 'logistic-chest-requester'
                        },
                        index: 1
                    }
                ],
                entities: [],
                item: 'blueprint',
                version: 68721770496
            }
        };
        var MAX_REQUEST_SLOTS = 12;
        for (var i = 0; i < inputEntitiesList.length; i += MAX_REQUEST_SLOTS) {
            var temp = JSON.parse(JSON.stringify(requesterChestBPBase));
            temp.entity_number = 1 + i / MAX_REQUEST_SLOTS;
            temp.position.x = i / MAX_REQUEST_SLOTS;
            for (var u = 0; i + u < inputEntitiesList.length && u < MAX_REQUEST_SLOTS; u++) {
                temp.request_filters.push({
                    index: 1 + u,
                    name: inputEntitiesList[i + u][0],
                    count: inputEntitiesList[i + u][1]
                });
            }
            outputBase.blueprint.entities.push(temp);
        }
        document.getElementById("out").value = BlueprintUtility.generateBlueprintString(outputBase).toString();
    }
    catch (e) {
        document.getElementById("out").value = "Error constructing output blueprint:\n" + e.toString();
        return;
    }
}
//# sourceMappingURL=blueprintTools.js.map