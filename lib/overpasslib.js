"use strict";
// OverPass Server Control
class OverPassControl {
	getGeojson(overpass) {
		return new Promise((resolve, reject) => {
			let LL = mapl.getLL(), query = "";
			let maparea = LL.SE.lat + ',' + LL.NW.lng + ',' + LL.NW.lat + ',' + LL.SE.lng;
			overpass.forEach(val => query += val + ";");
			let url = Conf.OverPassServer + `?data=[out:json][timeout:30][bbox:${maparea}];(${query});out body meta;>;out skel;`;
			console.log("OverPassControl: getGeojson: " + url);
			fetch(url)
				.then(data => data.json())
				.then(data => {
					if (data.elements.length == 0) { resolve(); return };
					let geojson = osmtogeojson(data, { flatProperties: true });
					console.log("OverPassControl: getGeojson: End.");
					resolve({ "geojson": geojson.features });
				}).catch(error => {
					console.log("OverPassControl: getGeojson: Error: " + error);
					reject(error);
				});
		});
	}
}
