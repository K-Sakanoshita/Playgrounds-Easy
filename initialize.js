/*	Main Process */
"use strict";

// Global Variable
var Conf = {};					// Config Praams
const FILES = ['./data/config.json', `./data/marker.json`, `./data/category.json`, './data/overpass.json'];
var ovpCont = new OverPassControl();
var poiCont = new PoiCont();
var cMapMaker = new CMapMaker();
var winCont = new WinCont();
var mapl = new MapLibre();
var setDetail = new DetailModal();

// initialize
console.log("Welcome to Community Map Maker.");
console.log("initialize: Start.");
window.addEventListener("DOMContentLoaded", function () {
	const fetchUrls = FILES.map(url => fetch(url).then(res => res.json()));
	Promise.all(fetchUrls).then(jsons => {
		for (let i = 0; i <= 3; i++) {
			Conf = Object.assign(Conf, jsons[i]);
		};
		Conf.category_keys = Object.keys(Conf.category);						// Make Conf.category_keys
		Conf.category_subkeys = Object.keys(Conf.category_sub);					// Make Conf.category_subkeys
		window.onresize = winCont.resizeWindows;    							// 画面サイズに合わせたコンテンツ表示切り替え
		winCont.resizeWindows();												// Set Window Size(mapidのサイズ指定が目的)
		winCont.splash(true);

		Promise.all([
			mapl.init(Conf)	// get_zoomなどmaplの情報が必要なためmapl.init後に実行
		]).then(results => {
			// mapl add control
			mapl.addControl("bottom-left", "zoomlevel", "");
			mapl.addControl("top-left", "basemenu", basemenu.innerHTML, "MapLibre-control m-0 p-0");			// Make: base list
			mapl.addNavigation("bottom-right");
			mapl.addControl("bottom-right", "maplist", "<button onclick='cMapMaker.changeMap()'><i class='fas fa-layer-group fa-lg'></i></button>", "maplibregl-ctrl-group");
			mapl.addControl("bottom-right", "global_status", "", "text-information");	// Make: progress
			mapl.addControl("bottom-right", "global_spinner", "", "spinner-border text-primary d-none");
			mapl.addScale("bottom-left");
			winCont.makeMenu(Conf.menu, "main_menu");
			cMapMaker.init();

			let eventMoveMap = cMapMaker.eventMoveMap.bind(cMapMaker);
			eventMoveMap().then(() => {
				winCont.splash(false);
				if (location.search !== "") {    							// 引数がある場合
					let search = location.search.replace(/[?&]fbclid.*/, '').replace(/%2F/g, '/');  // facebook対策
					search = search.replace('-', '/').replace('=', '/').slice(1);
					search = search.slice(-1) == "/" ? search.slice(0, -1) : search;				// facebook対策(/が挿入される)
					let params = search.split('&');	// -= -> / and split param
					history.replaceState('', '', location.pathname + "?" + search + location.hash);
					for (const param of params) {
						let keyv = param.split('/');
						switch (keyv[0]) {
							case "node":
							case "way":
							case "relation":
								let subparam = param.split('.');					// split child elements(.)
								cMapMaker.viewDetail(subparam[0], subparam[1]);
								break;
						};
					};
				};
				console.log("initial: End.");
			});
		});
	});
});
