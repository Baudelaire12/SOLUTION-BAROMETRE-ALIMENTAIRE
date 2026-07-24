"use client";
import { useEffect } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type { Feature } from "geojson";
import "leaflet/dist/leaflet.css";
import type { CommunesResponse } from "@/lib/api";

function colorFor(r: number | null | undefined, bands: number[]) {
  if (r == null) return "#d9d2c7";
  if (r > bands[2]) return "var(--risk-tres)";
  if (r > bands[1]) return "var(--risk-eleve)";
  if (r > bands[0]) return "var(--risk-modere)";
  return "#f0e3c4";
}

function FitBenin() {
  const map = useMap();
  useEffect(() => { map.setView([9.5, 2.3], 6.4); }, [map]);
  return null;
}

export default function RiskMap({ data }: { data: CommunesResponse }) {
  const style = (f?: Feature): PathOptions => ({
    fillColor: colorFor(f?.properties?.risk as number, data.bands),
    color: "var(--border)", weight: 0.6, fillOpacity: 0.85,
  });
  const onEach = (f: Feature, layer: Layer) => {
    const p = f.properties as { nom?: string; risk?: number };
    const risk = p?.risk != null ? `${(p.risk * 100).toFixed(1)} %` : "n.d.";
    layer.bindTooltip(`<b>${p?.nom ?? ""}</b><br/>Risque : ${risk}`, { sticky: true });
    layer.on({
      mouseover: (e) => e.target.setStyle({ weight: 2, color: "var(--primary)" }),
      mouseout: (e) => e.target.setStyle({ weight: 0.6, color: "var(--border)" }),
    });
  };
  return (
    <MapContainer style={{ height: "100%", width: "100%", background: "transparent" }}
      scrollWheelZoom zoomControl attributionControl={false}>
      <FitBenin />
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" subdomains="abcd" />
      <GeoJSON data={data.geojson} style={style} onEachFeature={onEach} />
    </MapContainer>
  );
}
