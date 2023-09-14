"use strict";
// MapLibre Control
class MapLibre {

    constructor() {
        this.map;
        this.Control = { "locate": "", "maps": "" };    // mapl object
        this.styles = {};
        this.selectStyle;
    };

    init(Conf) {
        return new Promise((resolve, reject) => {
            console.log("MapLibre: init start.");
            this.selectStyle = Conf.tile_default;
            Object.keys(Conf.tile).forEach(key => this.styles[key] = Conf.tile[key].style);
            this.map = new maplibregl.Map({
                "container": 'mapid', "style": this.styles[this.selectStyle], "maxZoom": Conf.maxZoom, "zoom": Conf.initZoom,
                "antialias": true, "hash": true, "center": Conf.initView
            });
            this.map.on('load', () => {
                console.log("MapLibre: init end.");
                resolve();
            });
        });
    };

    enable(flag) {
        if (flag) {
            this.map.scrollWheelZoom.enable();
            this.map.dragging.enable();
        } else {
            this.map.scrollWheelZoom.disable();
            this.map.dragging.disable();
        }
    };

    // Change Map Style / tilename:タイル名。空欄の時は設定された次のスタイル
    changeMap(tilename) {
        let styles = Object.keys(this.styles);
        let nextSt = (styles.indexOf(this.selectStyle) + 1) % styles.length;
        this.selectStyle = !tilename ? styles[nextSt] : tilename;
        mapl.map.setStyle(this.styles[this.selectStyle]);
    };

    on(event, callback) {
        this.map.on(event, callback);
    };

    // Marker追加(poiContから呼ばれる)
    addMarker(params) {
        var icon = document.createElement('div');
        icon.style.width = `${params.size + params.span_width}px`;
        icon.style.height = `${params.size}px`;
        let marker = new maplibregl.Marker(icon).setLngLat(params.poi.lnglat).addTo(this.map);
        marker.getElement().innerHTML= params.html;
        marker.mapmaker_id = params.poi.geojson.id;
        return marker;
    };

    // Marker削除
    delMaker(marker) {
        if (marker == undefined) return;
        if (marker.length == undefined) { marker.remove(); return };
        marker.forEach(m => m.remove());   // 子要素がある場合を想定
    };

    // 指定した座標とズームレベルへ移動
    flyTo(ll, zoomlv) {
        this.map.flyTo({ center: ll, zoom: zoomlv, speed: 2 });
    };

    getZoom() {
        return this.map.getZoom();
    };

    setZoom(zoomlv) {
        this.map.flyTo({ center: this.map.getCenter(), zoom: zoomlv, speed: 0.5 });
    };

    getCenter() {
        return this.map.getBounds().getCenter();
    };

    getLL(lll) {			// LngLatエリアの設定 [経度lng,緯度lat] lll:少し大きめにする
        let ll = { "NW": this.map.getBounds().getNorthWest(), "SE": this.map.getBounds().getSouthEast() };
        if (lll) {
            ll.NW.lng = ll.NW.lng * 0.99997;
            ll.SE.lng = ll.SE.lng * 1.00003;
            ll.SE.lat = ll.SE.lat * 0.99992;
            ll.NW.lat = ll.NW.lat * 1.00008;
        }
        return ll;
    };

    addControl(position, domid, html, cname) {     // add mapl control
        class HTMLControl {
            onAdd(map) {
                this._map = map;
                this._container = document.createElement('div');
                this._container.id = domid;
                this._container.className = 'maplibregl-ctrl ' + cname;
                this._container.innerHTML = html;
                this._container.style = "transform: initial;";
                return this._container;
            }
            onRemove() {
                this._container.parentNode.removeChild(this._container);
                this._map = undefined;
            }
        }
        this.map.addControl(new HTMLControl(), position);
    };

    addNavigation(position) {                               // add location
        this.map.addControl(new maplibregl.NavigationControl(), position);
        this.map.addControl(new maplibregl.GeolocateControl(), position);
    };

    addScale(position) {
        this.map.addControl(new maplibregl.ScaleControl(), position);
    };

    addGeojson(data, markerName) {
        console.log("maplib: addGeojson: " + markerName);
        let source = this.map.getSource(markerName);
        if (source !== undefined) {
            source.setData(data);
        } else if (Conf.osm !== undefined) {
            let exp = Conf.osm.expression;
            if (exp !== undefined) {
                this.map.addSource(markerName, { "type": "geojson", "data": data });
                this.map.addLayer({
                    'id': markerName,
                    'type': 'line',
                    'source': markerName,
                    'layout': {},
                    'paint': {
                        'line-color': exp.stroke,
                        'line-width': exp["stroke-width"],
                        'line-opacity': 0.8
                    }
                });
            }
        }
    };

    flat2single(cords, type) {  // flat cordsの平均値(Poiの座標計算用)
        let cord;
        const calc_cord = function (cords) {
            let lat = 0, lng = 0, counts = cords.length;
            for (let cord of cords) {
                lat += cord[0];
                lng += cord[1];
            };
            return [lat / counts, lng / counts];
        };
        switch (type) {
            case "Point":
                cord = [cords[0], cords[1]];
                break;
            case "LineString":
                cord = calc_cord(cords);
                break;
            default:
                let lat = 0, lng = 0;
                for (let idx in cords) {
                    cord = calc_cord(cords[idx]);
                    lat += cord[0];
                    lng += cord[1];
                }
                cord = [lat / cords.length, lng / cords.length];
                break;
        };
        return cord;
    }

    check_inner(lnglat, LL) {          // lnglatがLL(getLL)範囲内であれば true
        return (LL.NW.lat > lnglat[1] && LL.SE.lat < lnglat[1] && LL.NW.lng < lnglat[0] && LL.SE.lng > lnglat[0]);
    }

    ll2tile(ll, zoom) {                 // lnglatからタイル番号へ変換
        const maxLat = 85.05112878;     // 最大緯度
        zoom = parseInt(zoom);
        let lat = parseFloat(ll.lat);       // 緯度
        let lng = parseFloat(ll.lng);       // 経度
        let pixelX = parseInt(Math.pow(2, zoom + 7) * (lng / 180 + 1));
        let tileX = parseInt(pixelX / 256);
        let pixelY = parseInt((Math.pow(2, zoom + 7) / Math.PI) * ((-1 * Math.atanh(Math.sin((Math.PI / 180) * lat))) + Math.atanh(Math.sin((Math.PI / 180) * maxLat))));
        let tileY = parseInt(pixelY / 256);
        return { tileX, tileY };
    }

    tile2ll(tt, zoom, direction) {      // タイル番号からlnglatへ変換
        const maxLat = 85.05112878;     // 最大緯度
        zoom = parseInt(zoom);
        if (direction == "SE") {
            tt.tileX++;
            tt.tileY++;
        }
        let pixelX = parseInt(tt.tileX * 256); // タイル座標X→ピクセル座標Y
        let pixelY = parseInt(tt.tileY * 256); // タイル座標Y→ピクセル座標Y
        let lng = 180 * (pixelX / Math.pow(2, zoom + 7) - 1);
        let lat = (180 / Math.PI) * (Math.asin(Math.tanh((-1 * Math.PI / Math.pow(2, zoom + 7) * pixelY) + Math.atanh(Math.sin(Math.PI / 180 * maxLat)))));
        return { lat, lng };
    }

}
