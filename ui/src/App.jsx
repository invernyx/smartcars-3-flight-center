/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
    request,
    notify,
    applyAppColor,
    applyVAColor,
} from "@tfdidesign/smartcars3-ui-sdk";
import SearchFlights from "./pages/search-flights";
import FlightCenter from "./pages/flight-center";
import CreateFlight from "./pages/create-flight";
import Loading from "./components/loading";

function MainApp() {
    const [isLoading, setIsLoading] = useState(false);
    const [identity, setIdentity] = useState({});
    const urlParams = new URLSearchParams(window.location.search);
    const darkmode = urlParams.get("darkmode") === "true";
    const foreColor = urlParams.get("forecolor");
    const backColor = urlParams.get("backcolor");

    applyAppColor(document, darkmode);
    applyVAColor(document, foreColor, backColor);

    useEffect(() => {
        getIdentity();
    }, []);

    async function getIdentity() {
        setIsLoading(true);
        try {
            const response = await request({
                url: "http://localhost:7172/api/identity",
                method: "GET",
            });

            setIdentity(response);
        } catch (error) {
            notify("com.tfdidesign.flight-center", null, null, {
                message: "Failed to fetch identity.",
                type: "warning",
            });
        }
        setIsLoading(false);
    }

    if (isLoading) return <Loading />;

    const pluginData = identity?.airline?.plugins?.find(
        (p) => p.id === "com.tfdidesign.flight-center"
    );
    const charterFlights =
        pluginData?.appliedSettings?.charter_flights === true;
    const enableBooking = pluginData?.appliedSettings?.enable_booking !== false;

    return (
        <Routes>
            <Route path="/" element={<FlightCenter identity={identity} />} />
            <Route
                path="/search-flights/"
                element={
                    enableBooking ? (
                        <SearchFlights identity={identity} />
                    ) : (
                        <Navigate to="/" />
                    )
                }
            />
            <Route
                path="/create-flight"
                element={
                    charterFlights ? (
                        <CreateFlight identity={identity} />
                    ) : (
                        <Navigate to="/" />
                    )
                }
            />
        </Routes>
    );
}

export default MainApp;
