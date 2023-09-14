class CMapMaker {

	constructor() {
		this.status = "initialize";
		this.detail = false;				// viewDetail表示中はtrue
		this.open_osmid = "";				// viewDetail表示中はosmid
		this.id = 0;
		this.moveMapBusy = 0;
	};

	init() {
		console.log("CMapMaker: init.");
		mapl.on('moveend', this.eventMoveMap.bind(cMapMaker));   		// マップ移動時の処理
		mapl.on('zoomend', this.eventZoomMap.bind(cMapMaker));			// ズーム終了時に表示更新
	};

	viewMessage(title, message) {
		winCont.openModal({ "title": title, "message": message, "mode": "close", "callback_close": winCont.closeModal, "menu": false });
	};

	changeMap() {	// Change Map Style(rotation)
		mapl.changeMap();
	};

	viewArea() {	// Areaを表示させる
		mapl.addGeojson({ "type": "FeatureCollection", "features": poiCont.getPois().geojson }, Conf.markerName);
		console.log("viewArea: End.");
	};

	viewPoi() {		// Poiを表示させる
		console.log(`viewPoi: Start.`);
		poiCont.deleteAll();
		poiCont.setMarker();
		console.log("viewPoi: End.");
	};

	getPoi() {		// OSMからPoiを取得
		return new Promise((resolve) => {
			console.log("cMapMaker: getPoi: Start");
			winCont.spinner(true);
			if ((mapl.getZoom() < Conf.PoiViewZoom)) {
				winCont.spinner(false);
				console.log("[success]cMapMaker: getPoi End(more zoom).");
				resolve({ "update": true });
			} else {
				ovpCont.getGeojson(Conf.osm.overpass).then(ovanswer => {
					winCont.spinner(false);
					if (ovanswer) poiCont.addGeojson(ovanswer);
					console.log("[success]cMapMaker: getPoi End.");
					resolve({ "update": true });
				});
			};
		});
	};

	viewDetail(osmid, openid) {	// PopUpを表示(marker,openid=actlst.id)
		const closeDetail = () => {
			winCont.closeModal();
			history.replaceState('', '', location.pathname + location.hash);
			this.open_osmid = "";
			this.detail = false;
			mapid.focus();
		};
		if (this.detail) closeDetail();
		let osmobj = poiCont.getOSMid(osmid);
		let tags = osmobj == undefined ? {} : osmobj.geojson.properties;
		let title = `<img src="./${Conf.icon.path}/${poiCont.getIcon(tags)}" class="normal">`, message = "";
		title += tags.name == undefined ? "" : tags.name;
		winCont.makeMenu(Conf.detailMenu, "modal_menu");
		this.open_osmid = osmid;
		message += setDetail.make(tags);		// append OSM Tags(仮…テイクアウトなど判別した上で最終的には分ける)
		let catname = "";
		history.replaceState('', '', location.pathname + "?" + osmid + (!openid ? "" : "." + openid) + catname + location.hash);
		winCont.openModal({ "title": title, "message": message, "append": Conf.detailView.buttons, "mode": "close", "callback_close": closeDetail, "menu": true, "openid": openid });
		this.detail = true;
	};

	// URL共有
	shareURL() {
		let url = location.origin + location.pathname + location.search + location.hash;
		navigator.clipboard.writeText(url);
	};

	// EVENT: map moveend発生時のイベント
	eventMoveMap() {
		const MoveMapPromise = function (resolve, reject) {
			console.log("eventMoveMap: Start.");
			if (this.moveMapBusy > 1) return; 		// 処理中の時は戻る
			if (this.moveMapBusy == 1) clearTimeout(this.id);		// no break and cancel old timer.
			this.moveMapBusy = 1;
			this.id = setTimeout(() => {
				console.log("eventMoveMap: End.");
				this.moveMapBusy = 2;
				this.getPoi().then((status) => {
					this.moveMapBusy = 0;
					if (status.update) {
						this.viewArea();
						this.viewPoi();
						resolve();
					} else {
						this.moveMapBusy = 0;
						let bindMoveMapPromise = MoveMapPromise.bind(this);
						bindMoveMapPromise(resolve, reject);	// 失敗時はリトライ
					};
				})
			}, 700);
		};
		return new Promise((resolve, reject) => {
			if (this.moveMapBusy < 2) {
				let bindMoveMapPromise = MoveMapPromise.bind(cMapMaker);
				bindMoveMapPromise(resolve, reject);
			} else {
				resolve();
			}
		});
	};

	// EVENT: View Zoom Level & Status Comment
	eventZoomMap() {
		let poizoom = false;
		for (let [key, value] of Object.entries(Conf.PoiViewZoom)) {
			if (mapl.getZoom() >= value) poizoom = true;
		};
		let message = `"zoomlevel:" ${Math.round(mapl.getZoom())} `;
		if (!poizoom) message += `<br>morezoom`;
		zoomlevel.innerHTML = "<h2 class='zoom'>" + message + "</h2>";
	};
};
