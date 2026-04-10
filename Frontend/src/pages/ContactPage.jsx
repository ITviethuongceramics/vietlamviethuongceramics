import { useEffect, useRef, useState } from 'react';
import { MapPin, Mail, Phone, Building2, ChevronRight } from 'lucide-react';
import './ContactPage.scss';

const branches = [
  {
    id: 'dn',
    name: 'Chi nhánh Đà Nẵng',
    address: '246 Nguyễn Hữu Thọ, Phường Hòa Cường, TP. Đà Nẵng',
    email: 'facebook.com/gomsuviethuong',
    phone: '0905.386.888',
    lat: 16.0378,
    lng: 108.2105,
    image: 'https://res.cloudinary.com/dq8cmcln9/image/upload/v1775449642/danang_zprcls.webp',
  },
  {
    id: 'hp',
    name: 'Chi nhánh Hải Phòng',
    address: '298 Phạm Văn Đồng, Phường Hưng Đạo, TP. Hải Phòng',
    email: 'facebook.com/gomsuviethuong',
    phone: '0905.386.888',
    lat: 20.7963,
    lng: 106.7118,
    image: 'https://res.cloudinary.com/dq8cmcln9/image/upload/v1775449642/haiphong_dn94ip.jpg',
  },
  {
    id: 'hcm',
    name: 'Chi nhánh Hồ Chí Minh',
    address: '246 Nguyễn Duy Trinh, Phường Bình Trưng, TP. Hồ Chí Minh',
    email: 'facebook.com/gomsuviethuong',
    phone: '0905.386.888',
    lat: 10.7877,
    lng: 106.7583,
    image: 'https://viethuongceramics.com/wp-content/smush-webp/2026/01/LQM01215-scaled-1.jpg.webp',
  },
];

const VN_GEOJSON_URL =
  'https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/VNM/ADM0/geoBoundaries-VNM-ADM0.geojson';

export default function ContactPage() {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const heroRef = useRef(null);
  const [active, setActive] = useState(null);

  // Parallax hero
  useEffect(() => {
    function onScroll() {
      if (!heroRef.current) return;
      const bg = heroRef.current.querySelector('.cp-hero__bg');
      if (bg) bg.style.transform = `translateY(${window.scrollY * 0.35}px)`;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Map
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    function initMap() {
      if (!mapRef.current || leafletMap.current) return;

      const map = window.L.map(mapRef.current, {
        center: [16.0339, 108.2170], // ← mặc định Đà Nẵng
        zoom: 15,
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        dragging: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
      });


      // Tile sáng làm nền
      window.L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }
      ).addTo(map);

      // Fetch GeoJSON Việt Nam từ geoBoundaries (bao gồm hải phận)
      fetch(VN_GEOJSON_URL)
        .then(r => r.json())
        .then(data => {
          // Lấy tất cả coordinates để tạo mask
          const outerRing = [
            [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90],
          ];

          const innerRings = [];
          data.features.forEach(f => {
            const geo = f.geometry;
            if (geo.type === 'Polygon') {
              innerRings.push(geo.coordinates[0]);
            } else if (geo.type === 'MultiPolygon') {
              geo.coordinates.forEach(poly => innerRings.push(poly[0]));
            }
          });

          // Mask tối bên ngoài Việt Nam
          window.L.geoJSON(
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [outerRing, ...innerRings],
              },
            },
            {
              style: { fillColor: '#0d0d1a', fillOpacity: 0.72, stroke: false },
              interactive: false,
            }
          ).addTo(map);

          // Viền biên giới Việt Nam
          window.L.geoJSON(data, {
            style: {
              fill: false,
              color: '#C0392B',
              weight: 2,
              opacity: 0.85,
            },
            interactive: false,
          }).addTo(map);
        })
        .catch(() => {
          // Fallback nếu fetch lỗi: dùng source cũ
          fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
            .then(r => r.json())
            .then(data => {
              const vietnam = data.features.find(f => f.properties.ISO_A3 === 'VNM');
              if (!vietnam) return;

              const outerRing = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];
              const inner = vietnam.geometry.type === 'MultiPolygon'
                ? vietnam.geometry.coordinates.map(poly => poly[0])
                : [vietnam.geometry.coordinates[0]];

              window.L.geoJSON({
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [outerRing, ...inner] },
              }, {
                style: { fillColor: '#0d0d1a', fillOpacity: 0.72, stroke: false },
                interactive: false,
              }).addTo(map);

              window.L.geoJSON(vietnam, {
                style: { fill: false, color: '#C0392B', weight: 2, opacity: 0.85 },
                interactive: false,
              }).addTo(map);
            });
        });

      // Markers
      branches.forEach((branch, i) => {
        const icon = window.L.divIcon({
          className: '',
          html: `<div class="cp-marker">
            <div class="cp-marker__dot"></div>
            <div class="cp-marker__pulse"></div>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -20],
        });

        const marker = window.L.marker([branch.lat, branch.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<div class="cp-popup">
              <strong>${branch.name}</strong>
              <span>${branch.address}</span>
            </div>`,
            { closeButton: false, offset: [0, -8] }
          );

        marker.on('click', () => setActive(branch.id));
        markersRef.current[i] = marker;
      });
      setTimeout(() => {
        markersRef.current[0]?.openPopup();
      }, 600);

      setActive('dn'); // ← highlight card Đà Nẵng ngay từ đầu

      leafletMap.current = map;
      leafletMap.current = map;
    }

    if (window.L) initMap();
    else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
    };
  }, []);

  function handleCardClick(branch, index) {
    setActive(branch.id);
    if (leafletMap.current) {
      leafletMap.current.flyTo([branch.lat, branch.lng], 15, { duration: 1.2 });
      markersRef.current[index]?.openPopup();
    }
  }

  return (
    <div className="cp">

      {/* ── HERO ── */}
      <div className="cp-hero" ref={heroRef}>
        <div className="cp-hero__bg" />
        <div className="cp-hero__overlay" />
        <div className="cp-hero__inner">
          <p className="cp-hero__eyebrow">Công ty cổ phần xây dựng gốm sứ Việt Hương</p>
          <h1 className="cp-hero__title">
            <em>Tìm</em> Chi nhánh<br /><em>Gần</em> Bạn Nhất
          </h1>
          <p className="cp-hero__sub">
            Chi nhánh vật liệu xây dựng tại các thành phố lớn trên khắp Việt Nam
          </p>
        </div>
        <div className="cp-hero__wave">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path d="M0,30 C480,60 960,0 1440,30 L1440,60 L0,60 Z" fill="#f7f4f2" />
          </svg>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="cp-body">

        {/* ── SIDEBAR ── */}
        <div className="cp-sidebar">


          <div className="cp-cards">
            {branches.map((b, i) => (
              <div
                key={b.id}
                className={`cp-card ${active === b.id ? 'cp-card--active' : ''}`}
                onClick={() => handleCardClick(b, i)}
              >
                <div className="cp-card__thumb">
                  <img src={b.image} alt={b.name} />
                  <div className="cp-card__thumb-overlay" />
                  <span className="cp-card__thumb-index">{String(i + 1).padStart(2, '0')}</span>
                </div>

                <div className="cp-card__content">
                  <h3 className="cp-card__name">{b.name}</h3>
                  <div className="cp-card__row">
                    <MapPin size={13} className="cp-card__icon" />
                    <span>{b.address}</span>
                  </div>
                  <div className="cp-card__row">
                    <Mail size={13} className="cp-card__icon" />
                    <span>{b.email}</span>
                  </div>
                  <div className="cp-card__row">
                    <Phone size={13} className="cp-card__icon" />
                    <span>{b.phone}</span>
                  </div>
                  <div className="cp-card__footer">
                    <span className="cp-card__cta">
                      Xem trên bản đồ <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            ))}

          </div>

          <div className="cp-contact-box">
            <Building2 size={16} className="cp-contact-box__icon" />
            <div>
              <p className="cp-contact-box__label">Nhà máy VLXD Việt Hương</p>
              <p className="cp-contact-box__value">Cụm KCN Tây An, Xã Duy Xuyên, TP. Đà Nẵng</p>
            </div>

          </div>
          <div className="cp-1">
            <span className="cp-1__value">
              Thêm nhiều chi nhánh khác trên khắp cả nước++
            </span>
          </div>
        </div>


        {/* ── MAP ── */}
        <div className="cp-map-wrap">
          <div ref={mapRef} className="cp-map" />
        </div>

      </div>
    </div>
  );
}