function createRequesterBP() {
	let inputBP;
	//convert blueprint input string to an object
	try {
		//first byte is version, rest is base64 encoded
		let data = atob(document.getElementById("in").value.substr(1));
		//convert to bytearray and zlib inflate as string (pako does the utf8 to ucs2/utf16 part for us)
		let bytes = new Uint8Array(data.split('').map(function(x){return x.charCodeAt(0);}));
		let jsonInputBP = pako.inflate(bytes, { to: "string" });
		//parse as json
		inputBP = JSON.parse(jsonInputBP);
	}
	catch(e) {
		document.getElementById("out").value = `Error parsing input blueprint:\n${e.toString()}`;
		return;
	}
	
	try {
		//entity counter
		let inputEntities = {};
		//tiles behave very similar to entities for our needs
		let itemList = (inputBP.blueprint.entities || []).concat(inputBP.blueprint.tiles || []);
		
		//count every entity/tile
		itemList.forEach(e => {
			//conversion for special ponies where the placed entity name is not the item name
			//and a placed entity may cost several items (curved-rail only so far).
			let [baseEntityName, baseEntityCost] = {
				"curved-rail": ["rail", 4],
				"straight-rail": ["rail", 1],
				"stone-path": ["stone-brick", 1],
				"hazard-concrete-left": ["hazard-concrete", 1],
				"hazard-concrete-right": ["hazard-concrete", 1],
				"refined-hazard-concrete-left": ["refined-hazard-concrete", 1],
				"refined-hazard-concrete-left": ["refined-hazard-concrete", 1]
			}[e.name] || [e.name, 1];

			inputEntities[baseEntityName] = (inputEntities[baseEntityName] || 0) + baseEntityCost;
			//entities contained in others: modules (or perhaps other entities in mods)
			if (e.items)
				for (let item in e.items) inputEntities[item] = (inputEntities[item] || 0) + e.items[item];
		});

		let inputEntitiesList = Object.entries(inputEntities);
		
		let requesterChestBPBase = {
				entity_number: 1,
				name: 'logistic-chest-requester',
				position: {
				  x: 0,
				  y: 0
				},
				request_filters: [
				]
			  };
		
		let outputBase = {
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
				entities: [
				],
				item: 'blueprint',
				version: 68721770496
			  }
			};
		
		//amount of slots for requests that a requester chest has
		const MAX_REQUEST_SLOTS = 12;
		//For as many requester chests as we need to place all the requests
		for (let i = 0; i < inputEntitiesList.length; i += MAX_REQUEST_SLOTS) {
			let temp = JSON.parse(JSON.stringify(requesterChestBPBase));
			temp.entity_number = 1 + i / MAX_REQUEST_SLOTS;
			temp.position.x = i / MAX_REQUEST_SLOTS;
			//For request slots in a chest
			for (let u = 0; i + u < inputEntitiesList.length && u < MAX_REQUEST_SLOTS; u++) {
				temp.request_filters.push({
					index: 1 + u,
					name: inputEntitiesList[i + u][0],
					count: inputEntitiesList[i + u][1]
				});
			}
			outputBase.blueprint.entities.push(temp);
		}

		//back to json -> deflate -> base64 -> add version byte
		let result = btoa(pako.deflate(JSON.stringify(outputBase), { to: "string" }));
		document.getElementById("out").value = "0" + result;
	}
	catch(e) {
		document.getElementById("out").value = `Error constructing output blueprint:\n${e.toString()}`;
		return;
	}
}