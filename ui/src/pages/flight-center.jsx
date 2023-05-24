import React from "react";
import { useState } from "react";
import { request, notify, localApi } from "@tfdidesign/smartcars3-ui-sdk";
import { useEffect } from "react";
import { useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { GetAirport, GetAircraft, DecDurToStr } from "../helper.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRefresh, faTrash, faPlane } from "@fortawesome/pro-solid-svg-icons";

const baseUrl = "http://localhost:7172/api/com.tfdidesign.flight-center/";

const BidRow = (props) => {
    const [aircraft, setAircraft] = useState(null);
    const [route, setRoute] = useState(props?.flight?.route?.join(" ") ?? "");
    const [network, setNetwork] = useState("offline"); //set as default

    const depApt = GetAirport(props.flight.departureAirport, props.airports);
    const arrApt = GetAirport(props.flight.arrivalAirport, props.airports);

    useEffect(() => {
        if (!Array.isArray(props.flight.aircraft)) {
            const res = GetAircraft(props.flight.aircraft, props.aircraft);

            if (res) {
                setAircraft(res);
            }
        } else if (props.flight.aircraft.length > 0) {
            setAircraft(GetAircraft(props.flight.aircraft[0], props.aircraft));
        }
    }, [props.flight.aircraft, props.aircraft]);

    const flyFlight = async () => {
        if (!aircraft) {
            return notify("com.tfdidesign.flight-center", null, null, {
                message: "No suitable aircraft for this flight",
                type: "danger",
            });
        }
        const flight = {
            number: props.flight.code + props.flight.number,
            departure: depApt,
            arrival: arrApt,
            aircraft: aircraft,
            flightTime: props.flight.flightTime,
            departureTime: props.flight.departureTime,
            arrivalTime: props.flight.arrivalTime,
            network: network,
            cruise: props.flight.flightLevel,
            route: [...route.split(" ")],
            distance: props.flight.distance,
            bidId: props.flight.bidID,
            weightUnits: props.weightUnits,
            altitudeUnits: props.altitudeUnits,
            landingDistanceUnits: props.landingDistanceUnits,
            type: props.flight.type,
        };

        let foundBid = false;
        try {
            const bids = await request({
                url: baseUrl + "bookings",
                method: "GET",
                params: {
                    nocache: true,
                },
            });

            foundBid = !!bids.find((bid) => bid.bidID === props.flight.bidID);
        } catch (error) {
            notify("com.tfdidesign.flight-center", null, null, {
                message: "Failed to get bid flights",
                type: "danger",
            });

            return;
        }

        try {
            if (foundBid) {
                await localApi(
                    "api/com.tfdidesign.flight-tracking/startflight",
                    "POST",
                    flight
                );
                await localApi("api/navigate", "POST", {
                    pluginID: "com.tfdidesign.flight-tracking",
                });
            } else {
                notify("com.tfdidesign.flight-center", null, null, {
                    message: "Failed to start flight - bid not found",
                    type: "danger",
                });

                props.getBidFlights();
            }
        } catch (error) {
            console.error("flyFlight error", error);
        }
    };

    const planWithSimBrief = async () => {
        if (!aircraft) {
            return notify("com.tfdidesign.flight-center", null, null, {
                message: "No suitable aircraft for this flight",
                type: "danger",
            });
        }
        try {
            await localApi(
                "api/com.tfdidesign.simbrief/setflightinfo",
                "POST",
                {
                    flightInfo: {
                        bidId: props.flight.bidID,
                        airline: props.flight.code,
                        flightNumber: props.flight.number,
                        departure: depApt,
                        arrival: arrApt,
                        route: route || undefined,
                        aircraft: aircraft,
                        departureTime: props.flight.departureTime,
                    },
                }
            );

            await localApi("api/navigate", "POST", {
                pluginID: "com.tfdidesign.simbrief",
            });
        } catch (error) {
            notify("flight-center", null, null, {
                message: "Failed to plan flight with SimBrief",
                type: "danger",
            });
        }
    };

    if (!!!arrApt || !!!depApt) return <></>;

    if (props.expanded) {
        return (
            <div className="grid grid-cols-10 data-table-row p-3 mt-3 mx-8 box-shadow select items-center">
                <div
                    className="interactive"
                    onClick={() => props.setExpandedFlight(null)}
                >
                    <h2 className="hidden md:block">
                        {props.flight.code + props.flight.number}
                    </h2>
                    <h3 className="block md:hidden">
                        {props.flight.code + props.flight.number}
                    </h3>
                </div>
                <div className="text-center">
                    {props.flight.departureAirport}
                </div>
                <div className="text-center">{props.flight.arrivalAirport}</div>
                <div className="text-center">
                    {DecDurToStr(props.flight.flightTime)}
                </div>
                <div className="text-center col-span-2">
                    {aircraft && !Array.isArray(props.flight.aircraft) ? (
                        `${aircraft.name}${
                            aircraft.registration
                                ? ` (${aircraft.registration})`
                                : ""
                        }`
                    ) : (
                        <div className="w-full">
                            {Array.isArray(props.flight.aircraft) &&
                            props.flight.aircraft.length > 0 ? (
                                <select
                                    onChange={(e) => {
                                        setAircraft(
                                            GetAircraft(
                                                e.target.value,
                                                props.aircraft
                                            )
                                        );
                                    }}
                                    value={aircraft?.id ?? ""}
                                    className="border text-sm rounded-lg block w-full"
                                >
                                    {props.flight.aircraft
                                        .map((a) =>
                                            GetAircraft(a, props.aircraft)
                                        )
                                        .map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name}{" "}
                                                {a.registration
                                                    ? ` (${a.registration})`
                                                    : ""}
                                            </option>
                                        ))}
                                </select>
                            ) : (
                                <span>
                                    <i>No Aircraft available</i>
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <div className="text-right col-span-4">
                    <div
                        onClick={flyFlight}
                        className="button button-solid float-right ml-3 mb-1 mt-1"
                    >
                        <span>
                            Fly <FontAwesomeIcon icon={faPlane} />
                        </span>
                    </div>

                    {props.simBriefInstalled && (
                        <div
                            onClick={planWithSimBrief}
                            className="button button-solid float-right ml-3 mb-1 mt-1"
                        >
                            <span>Plan with SimBrief</span>
                        </div>
                    )}

                    <div
                        className="button button-hollow float-right ml-3 mb-1 mt-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            props.unbookFlight(props.flight.bidID);
                        }}
                    >
                        <span>
                            <FontAwesomeIcon icon={faTrash} />
                        </span>
                    </div>
                </div>

                <div className="col-span-3">
                    {props.flight.type === "P" ? (
                        <h3>Passenger Flight</h3>
                    ) : props.flight.type === "C" ? (
                        <h3>Cargo Flight</h3>
                    ) : (
                        <h3>Charter Flight</h3>
                    )}
                </div>
                <div className="col-span-5"></div>
                <div className="text-right col-span-2">
                    {props.expiresSoon ? (
                        <div className="bubble bubble-warning float-right">
                            Expires Soon
                        </div>
                    ) : null}
                </div>

                <div className="col-span-10">
                    {props.flight.notes ? (
                        <p className="mt-3">
                            <i>{props.flight.notes}</i>
                        </p>
                    ) : null}
                    <hr className="mt-3 mb-3" />
                </div>

                <div className="col-span-5">
                    <h4 className="text-light">{depApt.name}</h4>
                </div>
                <div className="col-span-5 text-right">
                    <h4>{arrApt.name}</h4>
                </div>

                <div className="col-span-5">
                    <h2>{props.flight.departureTime}</h2>
                </div>
                <div className="col-span-5 text-right">
                    <h2>{props.flight.arrivalTime}</h2>
                </div>

                <div className="col-span-5">
                    <b>{parseInt(props.flight.distance)} nm</b>
                </div>
                <div className="col-span-5 text-right">
                    <b>
                        {props.flight.flightLevel > 0
                            ? props.flight.flightLevel
                            : "No Flight Level Given"}
                    </b>
                </div>

                <div className="col-span-5 mr-1 mt-3">
                    <select
                        value={network}
                        onChange={(e) => {
                            setNetwork(e.target.value);
                        }}
                    >
                        <option value="offline">
                            Not flying with an online network
                        </option>
                        <option value="vatsim">Flying on VATSIM</option>
                        <option value="ivao">Flying on IVAO</option>
                        <option value="poscon">Flying on POSCON</option>
                        <option value="pilotedge">Flying on PilotEdge</option>
                    </select>
                </div>

                <div className="col-span-5 ml-2 mt-3">
                    <input
                        type="text"
                        placeholder="Route"
                        value={route}
                        onChange={(e) => {
                            setRoute(e.target.value);
                        }}
                    />
                </div>
            </div>
        );
    } else {
        return (
            <div
                className="grid grid-cols-10 items-center data-table-row p-3 mt-3 mx-8 select interactive-shadow"
                onClick={() => props.setExpandedFlight(props.flight.bidID)}
            >
                <div className="text-left">
                    {props.flight.code + props.flight.number}
                </div>
                <div className="text-center">
                    {props.flight.departureAirport}
                </div>
                <div className="text-center">{props.flight.arrivalAirport}</div>
                <div className="text-center">
                    {DecDurToStr(props.flight.flightTime)}
                </div>
                <div
                    className="text-center col-span-2"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    {aircraft && !Array.isArray(props.flight.aircraft) ? (
                        `${aircraft.name}${
                            aircraft.registration
                                ? ` (${aircraft.registration})`
                                : ""
                        }`
                    ) : (
                        <div className="w-full">
                            {Array.isArray(props.flight.aircraft) &&
                            props.flight.aircraft.length > 0 ? (
                                <select
                                    onChange={(e) => {
                                        setAircraft(
                                            GetAircraft(
                                                e.target.value,
                                                props.aircraft
                                            )
                                        );
                                    }}
                                    value={aircraft?.id ?? ""}
                                    className="border text-sm rounded-lg block w-full"
                                >
                                    {props.flight.aircraft
                                        .map((a) =>
                                            GetAircraft(a, props.aircraft)
                                        )
                                        .map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name}{" "}
                                                {a.registration
                                                    ? ` (${a.registration})`
                                                    : ""}
                                            </option>
                                        ))}
                                </select>
                            ) : (
                                <span>
                                    <i>No Aircraft available</i>
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <div className="text-right col-span-4">
                    <div
                        onClick={flyFlight}
                        className="button button-solid float-right ml-3 mb-1 mt-1"
                    >
                        <span>
                            Fly <FontAwesomeIcon icon={faPlane} />
                        </span>
                    </div>

                    {props.simBriefInstalled && (
                        <div
                            onClick={planWithSimBrief}
                            className="button button-solid float-right ml-3 mb-1 mt-1"
                        >
                            <span>Plan with SimBrief</span>
                        </div>
                    )}

                    <div
                        className="button button-hollow float-right ml-3 mb-1 mt-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            props.unbookFlight(props.flight.bidID);
                        }}
                    >
                        <span>
                            <FontAwesomeIcon icon={faTrash} />
                        </span>
                    </div>
                </div>
            </div>
        );
    }
};

const Bids = (props) => {
    const [logBookInstalled, setLogBookInstalled] = useState(false);
    const [bidsLoading, setBidsLoading] = useState(false);
    const [expandedFlight, setExpandedFlight] = useState(null);
    const [bidFlights, setBidFlights] = useState([]);

    const getBidFlights = async () => {
        setBidsLoading(true);
        try {
            const response = await request({
                url: baseUrl + "bookings",
                method: "GET",
                params: {
                    nocache: true,
                },
            });

            setBidFlights(response);
        } catch (error) {
            setBidFlights([]);

            notify("flight-center", null, null, {
                message: "Failed to get bid flights",
                type: "danger",
            });
        }
        setBidsLoading(false);
    };

    const unbookFlight = async (bidID) => {
        try {
            await request({
                url: `${baseUrl}unbook-flight`,
                method: "POST",
                data: {
                    bidID: bidID,
                },
            });

            getBidFlights();
        } catch (error) {
            notify("flight-center", null, null, {
                message: "Failed to unbook flight",
                type: "danger",
            });
        }
    };

    const setHeight = (elID) => {
        const el = document.getElementById(elID);
        if (!!!el) return;
        const viewHeight = window.innerHeight;
        const elOffTop = el.offsetTop;
        const marginBottom = 0;
        const newHeight = viewHeight - elOffTop - marginBottom;
        el.style.height = newHeight + "px";
    };

    const setBidsTblHeight = () => {
        setHeight("tblBody");
    };

    useEffect(() => {
        getBidFlights();
        isLogbookInstalled();
    }, []);

    useLayoutEffect(() => {
        setHeight("tblBody");
    }, []);

    useEffect(() => {
        window.addEventListener("resize", setBidsTblHeight);
        setBidsTblHeight();

        return (_) => {
            window.removeEventListener("resize", setBidsTblHeight);
        };
    });

    async function isLogbookInstalled() {
        try {
            const plugins = await localApi("api/plugins/installed");

            if (
                !!plugins.find(
                    (plugin) => plugin.id === "com.tfdidesign.logbook"
                )
            ) {
                setLogBookInstalled(true);
            }
        } catch (error) {
            setLogBookInstalled(false);
        }
    }

    function navigateToPireps() {
        return localApi("api/navigate", "POST", {
            pluginID: "com.tfdidesign.logbook",
        });
    }

    return (
        <div className="root-container">
            <div className="grid grid-cols-10 mb-3 mx-8">
                <h2 className="color-accent-bkg col-span-10">My Flights</h2>
            </div>

            <div className="mt-3 mx-8">
                <div className="flex flex-row">
                    <div className="flex place-items-left">
                        {logBookInstalled && (
                            <div>
                                <button
                                    onClick={navigateToPireps}
                                    className="button button-solid"
                                >
                                    View PIREPS
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-grow place-items-end content-end justify-end">
                        {props.pluginSettings?.enable_booking !== false ? (
                            <Link className="inline-link" to="/search-flights/">
                                <div className="button button-solid">
                                    <span>New Bid</span>
                                </div>
                            </Link>
                        ) : null}
                        {props.pluginSettings?.charter_flights ? (
                            <Link className="inline-link" to="/create-flight/">
                                <div className="button button-hollow ml-3">
                                    <span>Create Flight</span>
                                </div>
                            </Link>
                        ) : null}
                        <div
                            onClick={() => !bidsLoading && getBidFlights()}
                            className="button button-hollow ml-3"
                        >
                            <span className={bidsLoading ? "animate-spin" : ""}>
                                <FontAwesomeIcon icon={faRefresh} />
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-10 data-table-header p-3 mt-3 mx-8">
                <div className="text-left">Callsign</div>
                <div className="text-center">Departure</div>
                <div className="text-center">Arrival</div>
                <div className="text-center">Duration</div>
                <div className="col-span-2 text-center">Aircraft</div>
                <div className="text-right col-span-4"></div>
            </div>

            <div id="tblBody" className="overflow-y-auto">
                {bidFlights.length > 0 && props.airports.length > 0 ? (
                    bidFlights.map((bidFlight) => {
                        return (
                            <BidRow
                                key={bidFlight.bidID}
                                weightUnits={props.weightUnits}
                                altitudeUnits={props.altitudeUnits}
                                landingDistanceUnits={
                                    props.landingDistanceUnits
                                }
                                airports={props.airports}
                                aircraft={props.aircraft}
                                setExpandedFlight={setExpandedFlight}
                                expanded={expandedFlight === bidFlight.bidID}
                                flight={bidFlight}
                                unbookFlight={unbookFlight}
                                simBriefInstalled={props.simBriefInstalled}
                                getBidFlights={getBidFlights}
                            />
                        );
                    })
                ) : (
                    <div className="data-table-row p-3 mt-3 mx-8">
                        You have no bid flights.
                    </div>
                )}
            </div>
        </div>
    );
};

const FlightCenter = ({ identity }) => {
    const [weightUnits, setWeightUnits] = useState("KGS");
    const [altitudeUnits, setAltitudeUnits] = useState("ft");
    const [landingDistanceUnits, setLandingDistanceUnits] = useState("m");
    const [airports, setAirports] = useState([]);
    const [aircraft, setAircraft] = useState([]);
    const [simBriefInstalled, setSimBriefInstalled] = useState(false);

    const pluginData = identity?.airline?.plugins?.find(
        (p) => p.id === "com.tfdidesign.flight-center"
    );

    useEffect(() => {
        isSimBriefInstalled();
        getUnits();
    }, []);

    async function getUnits() {
        try {
            const settings = await localApi("api/settings", "GET");

            setWeightUnits(settings.core.weightUnits);
            setAltitudeUnits(settings.core.altitudeUnits);
            setLandingDistanceUnits(settings.core.landingDistanceUnits);
        } catch (error) {
            notify("logbook", null, null, {
                message: "Failed to retrieve settings",
                type: "danger",
            });
        }
    }

    async function isSimBriefInstalled() {
        try {
            const plugins = await localApi("api/plugins/installed");

            if (
                !!plugins.find(
                    (plugin) => plugin.id === "com.tfdidesign.simbrief"
                )
            ) {
                setSimBriefInstalled(true);
            }
        } catch (error) {
            setSimBriefInstalled(false);
        }
    }

    const getAirports = async () => {
        try {
            const response = await request({
                url: baseUrl + "airports",
                method: "GET",
            });
            setAirports(response);
        } catch (error) {
            notify("flight-center", null, null, {
                message: "Failed to fetch airports",
                type: "danger",
            });
        }
    };

    const getAircraft = async () => {
        try {
            const response = await request({
                url: baseUrl + "aircrafts",
                method: "GET",
            });
            setAircraft(response);
        } catch (error) {
            notify("flight-center", null, null, {
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
        <Bids
            airports={airports}
            aircraft={aircraft}
            simBriefInstalled={simBriefInstalled}
            pluginSettings={pluginData?.appliedSettings}
            weightUnits={weightUnits}
            altitudeUnits={altitudeUnits}
            landingDistanceUnits={landingDistanceUnits}
        />
    );
};

export default FlightCenter;
