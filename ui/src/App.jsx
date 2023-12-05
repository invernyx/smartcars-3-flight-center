/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { request, notify, localApi } from "@tfdidesign/smartcars3-ui-sdk";
import SearchFlights from "./pages/search-flights";
import FlightCenter from "./pages/flight-center";
import CreateFlight from "./pages/create-flight";
import Loading from "./components/loading";

function MainApp() {
    const [isLoading, setIsLoading] = useState(false);
    const [identity, setIdentity] = useState({});
    const [flightTrackingInstalled, setflightTrackingInstalled] =
        useState(false);
    const [currentFlightData, setCurrentFlightData] = useState(null);
    const [flightDataInterval, setFlightDataInterval] = useState(null);

    useEffect(() => {
        getIdentity();
        isFlightTrackingInstalled();
    }, []);

    useEffect(() => {
        if (flightTrackingInstalled && !flightDataInterval) {
            getCurrentFlightData();
            const id = setInterval(() => {
                getCurrentFlightData();
            }, 5000);
            setFlightDataInterval(id);
        }
        return () => {
            if (flightDataInterval) {
                clearInterval(flightDataInterval);
            }
        };
    }, [flightTrackingInstalled]);

    async function getCurrentFlightData() {
        const response = await localApi(
            "api/com.tfdidesign.flight-tracking/data",
        );

        if (!response.bidID) {
            setCurrentFlightData(null);
        } else {
            setCurrentFlightData(response);
        }
    }

    async function isFlightTrackingInstalled() {
        try {
            const plugins = await localApi("api/plugins/installed");

            if (
                !!plugins.find(
                    (plugin) => plugin.id === "com.tfdidesign.flight-tracking",
                )
            ) {
                setflightTrackingInstalled(true);
            }
        } catch (error) {
            setflightTrackingInstalled(false);
        }
    }

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
        (p) => p.id === "com.tfdidesign.flight-center",
    );
    const charterFlights =
        pluginData?.appliedSettings?.charter_flights === true;
    const enableBooking = pluginData?.appliedSettings?.enable_booking !== false;

    return (
        <Routes>
            <Route
                path="/"
                element={
                    <FlightCenter
                        identity={identity}
                        currentFlightData={currentFlightData}
                    />
                }
            />
            <Route
                path="/search-flights/"
                element={
                    enableBooking ? (
                        <SearchFlights
                            identity={identity}
                            currentFlightData={currentFlightData}
                        />
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
