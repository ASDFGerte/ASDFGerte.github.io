function createRequesterBP() {
	let inputBP;
	try {
		let data = atob(document.getElementById("in").value.substr(1));
		let bytes = new Uint8Array(data.split('').map(function(x){return x.charCodeAt(0);}));
		let inflated = pako.inflate(bytes, { to: "string" });
		//let jsonInputBP = String.fromCharCode.apply(null, new Uint16Array(inflated));
		let jsonInputBP = inflated;
		inputBP = JSON.parse(jsonInputBP);
	}
	catch(e) {
		document.getElementById("out").innerText = `Error parsing input blueprint:\n${e.toString()}`;
		return;
	}
	
	try {
		let inputEntities = {};
		let itemList = (inputBP.blueprint.entities || []).concat(inputBP.blueprint.tiles || []);
		
		itemList.forEach(e => {
			let multiplier = 1;
			//rails are special ponies
			switch (e.name) {
				case "curved-rail": 
					[e.name, multiplier] = ["rail", 4];
					break;
				case "straight-rail": 
					[e.name, multiplier] = ["rail", 1];
					break;
			}
			inputEntities[e.name] = (inputEntities[e.name] || 0) + multiplier;
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
		
		const MAX_REQUEST_SLOTS = 12;
		for (let i = 0; i < inputEntitiesList.length; i += MAX_REQUEST_SLOTS) {
			let temp = JSON.parse(JSON.stringify(requesterChestBPBase));
			temp.entity_number = 1 + i / MAX_REQUEST_SLOTS;
			temp.position.x = i / MAX_REQUEST_SLOTS;
			for (let u = 0; i + u < inputEntitiesList.length && u < MAX_REQUEST_SLOTS; u++) {
				temp.request_filters.push({
					index: 1 + u,
					name: inputEntitiesList[i + u][0],
					count: inputEntitiesList[i + u][1]
				});
			}
			outputBase.blueprint.entities.push(temp);
		}

		let result = btoa(pako.deflate(JSON.stringify(outputBase), { to: "string" }));
		document.getElementById("out").innerText = "0" + result;
	}
	catch(e) {
		document.getElementById("out").innerText = `Error constructing output blueprint:\n${e.toString()}`;
		return;
	}
}