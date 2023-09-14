"use strict";

// PoiData Control
class PoiCont {
	constructor() {
		this.pdata = { geojson: [], lnglat: [] };	//poi data variable
		this.catCache = {};							// カテゴリ名のキャッシュ
		this.geoidx = {};							// osm_idから配列内のindexを返す
		this.markers = [];
		this.osmpois = [];							// アイコン表示させたOSMIDリスト
	}

	getPois() { return poiCont.pdata }

	// Poiのリストを作成
	makeList() {
		let list = [];
		poiCont.pdata.geojson.forEach((geojson, idx) => {
			let tags = geojson.properties;
			let name = tags.name == undefined ? "" : tags.name;
			let cate = poiCont.getCatName(tags).filter(Boolean).join();
			let llat = poiCont.pdata.lnglat[idx];
			let data = [tags.id, name, cate, llat];
			list.push(data);
		});
		return list;
	}

	addGeojson(pois) {								// add geojson pois / pois: {geojson: []}
		poiCont.pdata = { geojson: [], lnglat: [] };
		console.log("PoiCont: addGetjson: Start.")
		pois.geojson.forEach((node, node_idx) => {			// 既存Poiに追加
			let geojson = pois.geojson[node_idx];
			//poiCont.setGeojson(geojson);
			poiCont.pdata.geojson.push(geojson);
			let ll = mapl.flat2single(node.geometry.coordinates, node.geometry.type);
			poiCont.pdata.lnglat[node_idx] = [ll[0], ll[1]];
			poiCont.geoidx[node.id] = node_idx;
		});
		console.log("PoiCont: addGetjson: End.");
	}

	getOSMid(osmid) {           								// osmidを元にgeojsonを返す
		let idx = poiCont.geoidx[osmid];
		return idx == undefined ? undefined : { geojson: poiCont.pdata.geojson[idx] };
	};

	getCatName(tags) {          							// get Category Name from Conf.category(Global Variable)
		if (poiCont.catCache[tags.id] !== undefined) return Array.from(poiCont.catCache[tags.id]);  // 配列をコピーして返す(参照返しだと値が壊れる)
		let catname = "", mainkey = "", mainval = "";
		let mainkeys = Conf.category_keys.filter(key => (tags[key] !== undefined) && key !== "*");	// srarch tags
		if (mainkeys == undefined) return Conf.category.tag['*']['*'];
		for (mainkey of mainkeys) {
			mainval = tags[mainkey] == undefined ? "*" : tags[mainkey];
			catname = Conf.category[mainkey][mainval];
			catname = (catname !== undefined) ? catname : "";
			if (catname !== "") break;		// if found catname then break
		}

		let subcatname = "";
		let subtag = Conf.category_sub[mainval];									// ex: subtag = {"religion": {"shinto":"a.svg","buddhist":"b.svg"}}
		if (subtag !== undefined) {
			for (let subkey of Object.keys(subtag)) {								// subkey: ex: religion
				if (subcatname !== "") break;
				for (let subval of Object.keys(subtag[subkey])) { 					// subval: ex: shinto
					subcatname = (tags[subkey] == subval) ? subtag[subkey][subval] : "";
					if (subcatname !== "") break;
				};
			};
		};
		if (catname == "") console.log("poiCont: getCatName: no key." + mainkey + "," + mainval + " / " + tags.id);
		poiCont.catCache[tags.id] = [catname, subcatname];
		return [catname, subcatname];
	}

	getIcon(tags) {		// get icon filename
		let mainico = "", subicon = "", mainkey = "", mainval = "";
		let mainkeys = Conf.category_keys.filter(key => (tags[key] !== undefined) && key !== "*");	// srarch tags
		if (mainkeys == undefined) return Conf.marker.tag['*']['*'];
		for (mainkey of mainkeys) {
			mainval = tags[mainkey] == undefined ? "*" : tags[mainkey];
			mainico = Conf.marker.tag?.[mainkey]?.[mainval];
			mainico = (mainico !== undefined) ? mainico : "";
			if (mainico !== "") break;		// if found icon then break
		}

		let subtag = Conf.marker.subtag[mainval];					// ex: subtag = {"religion": {"shinto":"a.svg","buddhist":"b.svg"}}
		if (subtag !== undefined) {
			for (let subkey of Object.keys(subtag)) {				// subkey: ex: religion
				if (subicon !== "") break;
				for (let subval of Object.keys(subtag[subkey])) { 	// subval: ex: shinto
					subicon = (tags[subkey] == subval) ? subtag[subkey][subval] : "";
					if (subicon !== "") break;
				};
			};
		};
		mainico = subicon !== "" ? subicon : mainico;
		return mainico == "" ? Conf.marker.tag['*']['*'] : mainico;
	}

	// Poi表示
	setMarker() {
		const makeMarker = function (params) {		// Make Marker(Sometimes multiple markers are returned)
			return new Promise((resolve) => {
				let tags = params.poi.geojson.properties.tags == undefined ? params.poi.geojson.properties : params.poi.geojson.properties.tags;
				let name = tags[params.langname] == undefined ? tags.name : tags[params.langname];
				name = tags["bridge:name"] == undefined ? name : tags["bridge:name"];	// 橋の名称があれば優先
				name = (name == "" || name == undefined) ? "" : name;
				params.html = `<div class="d-flex flex-column align-items-center">`;
				params.span_width = name !== "" ? name.length * Conf.effect.text.size : 0;
				let css_name = "circle";
				params.size = Conf.icon[css_name];
				params.html += `<img class="${css_name}" src="./${Conf.icon.path}/${poiCont.getIcon(tags)}" icon-name="${name}" onclick="cMapMaker.viewDetail('${params.poi.geojson.id}')">`;
				let span = `<span class="${css_name} fs-${Conf.effect.text.size}">${name}</span>`;
				if (name !== "" && Conf.effect.text.view) params.html += span;
				resolve(mapl.addMarker(params));
			});
		};
		let LL = mapl.getLL();
		poiCont.markers = [];
		if (poiCont.pdata.geojson !== undefined) {	// pois表示
			poiCont.pdata.geojson.forEach(function (geojson, idx) {
				let poi = { "geojson": poiCont.pdata.geojson[idx], "lnglat": poiCont.pdata.lnglat[idx] };
				if (mapl.check_inner(poi.lnglat, LL)) {
					if (!poiCont.osmpois.includes(geojson.id)) {		// 未表示の場合
						poiCont.osmpois.push(geojson.id);
						makeMarker({ poi: poi, langname: 'name', zIndexOffset: 0 }).then(marker => {
							if (marker !== undefined) poiCont.markers.push(marker);
						});
					};
				};
			});
		};
		console.log("PoiCont: setMarker: End.");
	}

	deleteAll() {
		if (poiCont.markers !== undefined) {
			poiCont.markers.forEach(marker => {
				poiCont.osmpois = poiCont.osmpois.filter(n => n !== marker.mapmaker_id);
				mapl.delMaker(marker);
			});
		};
		poiCont.markers = [];
		poiCont.osmpois = [];
		console.log("PoiCont: deleteAll: End.");
	}
};
