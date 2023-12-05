/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useLayoutEffect } from "react";
import { Range, getTrackBackground } from "react-range";
import { Link } from "react-router-dom";
import { request, notify, localApi } from "@tfdidesign/smartcars3-ui-sdk";
import { useEffect, useRef } from "react";
import { GetAircraft } from "../helper.js";
import Autocomplete from "../components/autocomplete";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLeft } from "@fortawesome/pro-solid-svg-icons";
import Flight from "../components/flight";

const baseUrl = "http://localhost:7172/api/com.tfdidesign.flight-center/";

const SearchFlightsContent = (props) => {
    const [depApt, setDepApt] = useState("");
    const [arrApt, setArrApt] = useState("");
    const [callsign, setCallsign] = useState("");
    const [aircraft, setAircraft] = useState("");
    const [durations, setDurations] = useState([0, 11]);
    const [distances, setDistances] = useState([0, 11]);
    const [simBriefInstalled, setSimBriefInstalled] = useState(false);
    const [expandedFlight, setExpandedFlight] = useState(-1);
    const [flights, setFlights] = useState([]);
    const [sortParams, setSortParams] = useState(null);
    const [width, setWidth] = useState(0);
    const widthRef = useRef(null);

    useEffect(() => {
        isSimBriefInstalled();
    }, []);

    async function isSimBriefInstalled() {
        try {
            const plugins = await localApi("api/plugins/installed");

            if (
                !!plugins.find(
                    (plugin) => plugin.id === "com.tfdidesign.simbrief",
                )
            ) {
                setSimBriefInstalled(true);
            }
        } catch (error) {
            setSimBriefInstalled(false);
        }
    }

    const sortBy = (by) => {
        let newParams = { by: by, direction: 1 };

        if (sortParams !== null) {
            if (sortParams.by === by) {
                if (sortParams.direction === 1) newParams.direction = -1;
                else if (sortParams.direction === -1) newParams = null;
            }
        }

        setSortParams(newParams);
    };

    const getSortingSymbol = (by) => {
        if (sortParams === null || sortParams.by !== by) return null;
        if (sortParams.direction === 1)
            return (
                <span className="color-accent-bkg">
                    <b>&uarr;</b>
                </span>
            );
        else return <span className="color-accent-bkg">&darr;</span>;
    };

    const getFlights = async () => {
        try {
            let params = {};
            if (depApt.length >= 3)
                params.departure = depApt.substring(
                    0,
                    Math.min(4, depApt.length),
                );
            if (arrApt.length >= 3)
                params.arrival = arrApt.substring(
                    0,
                    Math.min(4, arrApt.length),
                );
            if (durations[0] > 0) params.minDur = durations[0];
            if (durations[1] < 11) params.maxDur = durations[1];
            if (distances[0] > 0) params.minDist = distances[0] * 300;
            if (distances[1] < 11) params.maxDist = distances[1] * 300;
            if (callsign.length > 0) params.callsign = callsign;
            if (aircraft !== undefined && aircraft !== "")
                params.aircraft = aircraft;

            const response = await request({
                url: `${baseUrl}flights`,
                params: params,
                method: "GET",
            });

            if (Array.isArray(response)) {
                setFlights(response);
            } else {
                setFlights([]);
                notify("com.tfdidesign.flight-center", null, null, {
                    message: "Error parsing flights",
                    type: "danger",
                });
            }
        } catch (error) {
            notify("com.tfdidesign.flight-center", null, null, {
                message: "Failed to fetch flights",
                type: "danger",
            });
        }
    };

    const updateWidth = () => {
        if (!widthRef.current) return;
        setWidth(widthRef.current.offsetWidth);
    };

    const onWindowResize = () => {
        setHeight("tblBody");
        updateWidth();
    };

    useEffect(() => {
        getFlights();
    }, [depApt, arrApt, durations, distances, callsign, aircraft]);

    useLayoutEffect(() => {
        setHeight("tblBody");
        updateWidth();
    }, []);

    useEffect(() => {
        window.addEventListener("resize", onWindowResize);
        onWindowResize();

        return (_) => {
            window.removeEventListener("resize", onWindowResize);
        };
    });

    const setHeight = (elID) => {
        const el = document.getElementById(elID);
        if (!!!el) return;
        const viewHeight = window.innerHeight;
        const elOffTop = el.offsetTop;
        const marginBottom = 0;
        const newHeight = viewHeight - elOffTop - marginBottom;
        el.style.height = newHeight + "px";
    };

    const sortedFlights = flights !== null ? [...flights] : [];
    if (sortParams !== null) {
        sortedFlights.sort((a, b) => {
            let left = null;
            let right = null;

            switch (sortParams.by) {
                case "callsign":
                    left = a.code + a.number;
                    right = b.code + b.number;
                    break;
                case "departure":
                    left = a.departureAirport;
                    right = b.departureAirport;
                    break;
                case "departureTime":
                    left = a.departureTime;
                    right = b.departureTime;
                    break;
                case "arrival":
                    left = a.arrivalAirport;
                    right = b.arrivalAirport;
                    break;
                case "duration":
                    left = a.flightTime;
                    right = b.flightTime;
                    break;
                case "aircraft":
                    left = GetAircraft(a.aircraft, props.aircraft)?.name;
                    right = GetAircraft(b.aircraft, props.aircraft)?.name;
                    break;
                default:
                    left = a.id;
                    right = b.id;
                    break;
            }

            if (sortParams.direction === -1)
                return String(right).localeCompare(String(left));
            else return String(left).localeCompare(String(right));
        });
    }

    const airportStrings = props.airports.map((airport) => {
        return airport.code + " - " + airport.name;
    });

    return (
        <div className="root-container">
            <div className="mb-3 mx-8">
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <Link className="inline-link" to="/">
                                    <div className="p-3 interactive interactive-shadow">
                                        <FontAwesomeIcon icon={faLeft} />
                                    </div>
                                </Link>
                            </td>
                            <td>
                                <div className="ml-3">
                                    <h3>Flight Center</h3>
                                    <h2 className="color-accent-bkg">
                                        Search For a Flight
                                    </h2>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="groupbox mb-3 p-3 mx-8">
                <div className="grid grid-cols-4">
                    <div className="col-span-1 pr-1">
                        <Autocomplete
                            placeholder="Departure Airport"
                            options={airportStrings}
                            value={depApt}
                            onChange={(e) => {
                                setDepApt(e);
                            }}
                            required={true}
                        />
                    </div>

                    <div className="col-span-1 px-1 z-10">
                        <Autocomplete
                            placeholder="Arrival Airport"
                            options={airportStrings}
                            value={arrApt}
                            onChange={(e) => {
                                setArrApt(e);
                            }}
                            required={true}
                        />
                    </div>

                    <div className="col-span-1 px-1">
                        <select
                            required
                            value={aircraft}
                            onChange={(e) => {
                                setAircraft(e.target.value);
                            }}
                        >
                            <option value="">Any Aircraft</option>
                            {props.aircraft.map((aircraft) => {
                                return (
                                    <option
                                        key={aircraft.id}
                                        value={aircraft.id}
                                    >
                                        {aircraft.name}
                                        {!!aircraft.registration
                                            ? " (" + aircraft.registration + ")"
                                            : null}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div className="col-span-1 pl-1">
                        <input
                            type="text"
                            placeholder="CALLSIGN"
                            value={callsign}
                            onChange={(e) => {
                                setCallsign(e.target.value);
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-4">
                    <div className="col-span-2 mr-1 pt-3">
                        <label>Duration</label>

                        <div className="mt-3 px-2">
                            <Range
                                min={0}
                                max={11}
                                renderTrack={({ props, children }) => (
                                    <div
                                        className="range-track"
                                        {...props}
                                        style={{
                                            ...props.style,
                                            background: getTrackBackground({
                                                min: 0,
                                                max: 11,
                                                values: durations,
                                                colors: [
                                                    "#caced2",
                                                    "rgba(var(--va-accent-back-color), 1)",
                                                    "#caced2",
                                                ],
                                            }),
                                        }}
                                    >
                                        {children}
                                    </div>
                                )}
                                renderThumb={({ props }) => (
                                    <div
                                        className="range-thumb"
                                        {...props}
                                        style={{
                                            ...props.style,
                                        }}
                                    />
                                )}
                                values={durations}
                                onChange={(values) => {
                                    setDurations(values);
                                }}
                            />
                        </div>

                        <div className="mt-3 grid grid-cols-2">
                            <div className="col-span-1">
                                {durations[0] > 0
                                    ? durations[0] +
                                      " hour" +
                                      (durations[0] > 1 ? "s" : "")
                                    : "Any"}
                            </div>
                            <div className="col-span-1 text-right">
                                {durations[1] < 11
                                    ? durations[1] +
                                      " hour" +
                                      (durations[1] > 1 ? "s" : "")
                                    : "Any"}
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2 ml-1 pt-3">
                        <label>Distance</label>

                        <div className="mt-3 px-2">
                            <Range
                                min={0}
                                max={11}
                                renderTrack={({ props, children }) => (
                                    <div
                                        className="range-track"
                                        {...props}
                                        style={{
                                            ...props.style,
                                            background: getTrackBackground({
                                                min: 0,
                                                max: 11,
                                                values: distances,
                                                colors: [
                                                    "#caced2",
                                                    "rgba(var(--va-accent-back-color), 1)",
                                                    "#caced2",
                                                ],
                                            }),
                                        }}
                                    >
                                        {children}
                                    </div>
                                )}
                                renderThumb={({ props }) => (
                                    <div
                                        className="range-thumb"
                                        {...props}
                                        style={{
                                            ...props.style,
                                        }}
                                    />
                                )}
                                values={distances}
                                onChange={(values) => {
                                    setDistances(values);
                                }}
                            />
                        </div>

                        <div className="mt-3 grid grid-cols-2">
                            <div className="col-span-1">
                                {distances[0] > 0
                                    ? distances[0] * 300 + "nm"
                                    : "Any"}
                            </div>
                            <div className="col-span-1 text-right">
                                {distances[1] < 11
                                    ? distances[1] * 300 + "nm"
                                    : "Any"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-8 mt-3">
                <h4>
                    {sortedFlights.length > 0
                        ? sortedFlights.length >= 100
                            ? "100+ Flights Found"
                            : sortedFlights.length > 1
                            ? sortedFlights.length + " Flights Found"
                            : "1 Flight Found"
                        : "No Flights Found"}
                </h4>
            </div>

            <div
                ref={widthRef}
                className="grid grid-cols-10 data-table-header p-3 mt-3 mx-8"
            >
                <div
                    className="col-span-2 interactive"
                    onClick={() => {
                        sortBy("callsign");
                    }}
                >
                    Callsign {getSortingSymbol("callsign")}
                </div>
                <div
                    className="text-left interactive"
                    onClick={() => {
                        sortBy("departure");
                    }}
                >
                    Departure {getSortingSymbol("departure")}
                </div>
                <div
                    className="text-left interactive"
                    onClick={() => {
                        sortBy("arrival");
                    }}
                >
                    Arrival {getSortingSymbol("arrival")}
                </div>
                <div
                    className="text-left interactive"
                    onClick={() => {
                        sortBy("departureTime");
                    }}
                >
                    Schedule {getSortingSymbol("departureTime")}
                </div>
                <div
                    className="text-left interactive"
                    onClick={() => {
                        sortBy("duration");
                    }}
                >
                    Duration {getSortingSymbol("duration")}
                </div>
                <div
                    className="text-left interactive col-span-2"
                    onClick={() => {
                        sortBy("aircraft");
                    }}
                >
                    Aircraft {getSortingSymbol("aircraft")}
                </div>
                <div className="text-right col-span-2"></div>
            </div>

            <div id="tblBody" className="overflow-y-auto pl-8">
                {props.aircraft.length > 0 && sortedFlights.length > 0 ? (
                    sortedFlights.map((flight) => (
                        <div style={{ width: `${width}px` }}>
                            <Flight
                                key={flight.id}
                                airports={props.airports}
                                aircraft={props.aircraft}
                                setExpandedFlight={setExpandedFlight}
                                expanded={expandedFlight === flight.id}
                                flight={
                                    props.pluginSettings
                                        ?.allow_any_aircraft_in_fleet
                                        ? {
                                              ...flight,
                                              aircraft: [],
                                              defaultAircraft: flight.aircraft,
                                          }
                                        : flight
                                }
                                simBriefInstalled={simBriefInstalled}
                                currentFlightData={props.currentFlightData}
                            />
                        </div>
                    ))
                ) : (
                    <div className="data-table-row p-3 mt-3 mr-8">
                        No flights matching the search parameters were found.
                    </div>
                )}
            </div>
        </div>
    );
};

const SearchFlights = ({ identity, currentFlightData }) => {
    const [airports, setAirports] = useState([]);
    const [aircraft, setAircraft] = useState([]);

    const pluginData = identity?.airline?.plugins?.find(
        (p) => p.id === "com.tfdidesign.flight-center",
    );

    const getAirports = async () => {
        try {
            const response = await request({
                url: `${baseUrl}airports`,
                method: "GET",
            });
            setAirports(response);
        } catch (error) {
            notify("com.tfdidesign.flight-center", null, null, {
                message: "Failed to fetch airports",
                type: "danger",
            });
        }
    };

    const getAircraft = async () => {
        try {
            const response = await request({
                url: `${baseUrl}aircrafts`,
                method: "GET",
            });

            response.sort((a, b) => a.name.localeCompare(b.name));

            setAircraft(response);
        } catch (error) {
            notify("com.tfdidesign.flight-center", null, null, {
                message: "Failed to fetch aircraft",
                type: "danger",
            });
        }
    };

    useEffect(() => {
        getAirports();
        getAircraft();
    }, []);

    return (
        <SearchFlightsContent
            airports={airports}
            aircraft={aircraft}
            pluginSettings={pluginData?.appliedSettings}
            currentFlightData={currentFlightData}
        />
    );
};

export default SearchFlights;
