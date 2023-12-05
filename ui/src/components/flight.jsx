/*  eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { request, notify, localApi } from "@tfdidesign/smartcars3-ui-sdk";
import { useEffect } from "react";
import { GetAirport, GetAircraft, DecDurToStr } from "../helper.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faTrash,
    faCloudArrowDown,
    faRoute,
    faPlaneDeparture,
    faPlus,
    faCompass,
} from "@fortawesome/pro-solid-svg-icons";
import { Tooltip } from "react-tooltip";

const baseUrl = "http://localhost:7172/api/com.tfdidesign.flight-center/";

const Flight = (props) => {
    const [aircraft, setAircraft] = useState(null);
    const [shouldRender, setShouldRender] = useState(false);
    const [route, setRoute] = useState(props?.flight?.route?.join(" ") ?? "");
    const [network, setNetwork] = useState("offline"); //set as default

    const depApt = GetAirport(props.flight.departureAirport, props.airports);
    const arrApt = GetAirport(props.flight.arrivalAirport, props.airports);

    const navigate = useNavigate();

    useEffect(() => {
        if (!Array.isArray(props.flight.aircraft)) {
            const res = GetAircraft(props.flight.aircraft, props.aircraft);

            if (res) {
                setAircraft(res);
            }
        } else if (props.flight.aircraft.length > 0) {
            setAircraft(GetAircraft(props.flight.aircraft[0], props.aircraft));
        } else if (
            props.flight.aircraft.length <= 0 &&
            props.flight.defaultAircraft
        ) {
            setAircraft(
                GetAircraft(props.flight.defaultAircraft, props.aircraft),
            );
        }
        setShouldRender(true);
    }, [props.flight.aircraft, props.aircraft]);

    const _bidFlight = async () => {
        try {
            const response = await request({
                url: `${baseUrl}book-flight`,
                method: "POST",
                data: {
                    flightID: `${props.flight.id}`,
                },
            });

            if (response && response.bidID) {
                notify("com.tfdidesign.flight-center", null, null, {
                    message: "Flight booked successfully",
                    type: "success",
                });
                return response.bidID;
            } else {
                throw new Error("Failed to book flight");
            }
        } catch (error) {
            notify("com.tfdidesign.flight-center", null, null, {
                message: "Failed to book flight",
                type: "danger",
            });
        }
    };

    const bidFlight = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        await _bidFlight();

        navigate("/");
    };

    const flyFlight = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const bidID = props.flight.bidID
            ? props.flight.bidID
            : await _bidFlight();

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
            bidId: bidID,
            weightUnits: props.weightUnits,
            altitudeUnits: props.altitudeUnits,
            landingDistanceUnits: props.landingDistanceUnits,
            type: props.flight.type,
        };

        let foundBid = false;
        try {
            const bids = await request({
                url: `${baseUrl}bookings`,
                method: "GET",
                params: {
                    nocache: true,
                },
            });

            foundBid = !!bids.find((bid) => bid.bidID === bidID);
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
                    flight,
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

    const restoreFlight = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!aircraft) {
            return notify("com.tfdidesign.flight-center", null, null, {
                message: "No suitable aircraft for this flight",
                type: "danger",
            });
        }

        try {
            const recoverableFlightData = await localApi(
                "api/com.tfdidesign.flight-center/recover",
            );

            if (
                !recoverableFlightData ||
                recoverableFlightData.bidID !== props.flight.bidID
            ) {
                throw new Error("No suitable flight found");
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
                profilerData: recoverableFlightData.profilerData,
                flightLog: recoverableFlightData.flightLog,
                guid: recoverableFlightData.guid,
                uuid: recoverableFlightData.uuid,
                phase: recoverableFlightData.phase,
                elapsedTime: recoverableFlightData.elapsedTime,
                elapsedFlightTime: recoverableFlightData.elapsedFlightTime,
                blockTime: recoverableFlightData.blockTime,
                startingFuel: recoverableFlightData.startingFuel,
                loggerConfig: recoverableFlightData.loggerConfig,
            };

            let foundBid = false;
            try {
                const bids = await request({
                    url: `${baseUrl}bookings`,
                    method: "GET",
                    params: {
                        nocache: true,
                    },
                });

                foundBid = !!bids.find(
                    (bid) => bid.bidID === props.flight.bidID,
                );
            } catch (error) {
                notify("com.tfdidesign.flight-center", null, null, {
                    message: "Failed to get bid flights",
                    type: "danger",
                });

                return;
            }

            if (foundBid) {
                await localApi(
                    "api/com.tfdidesign.flight-tracking/restoreflight",
                    "POST",
                    flight,
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
            return notify("com.tfdidesign.flight-center", null, null, {
                message: "No suitable flight found",
                type: "danger",
            });
        }
    };

    const planWithSimBrief = async () => {
        if (!aircraft) {
            return notify("com.tfdidesign.flight-center", null, null, {
                message: "No suitable aircraft for this flight",
                type: "danger",
            });
        }
        const bidID = props.flight.bidID
            ? props.flight.bidID
            : await _bidFlight();

        try {
            await localApi(
                "api/com.tfdidesign.simbrief/setflightinfo",
                "POST",
                {
                    flightInfo: {
                        bidId: bidID,
                        airline: props.flight.code,
                        flightNumber: props.flight.number,
                        departure: depApt,
                        arrival: arrApt,
                        route: route || undefined,
                        aircraft: aircraft,
                        departureTime: props.flight.departureTime,
                        type: props.flight.type,
                        network: network,
                    },
                },
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

    if (!!!arrApt || !!!depApt || !shouldRender) return <></>;

    let recoverable = false;
    if (
        props.flight.bidID &&
        props.recoverableFlight &&
        props.recoverableFlight.bidID === props.flight.bidID
    ) {
        recoverable = true;
    }

    if (props.expanded) {
        return (
            <div className="grid grid-cols-10 data-table-row p-3 mt-3 box-shadow select items-center">
                <div
                    className="interactive col-span-2"
                    onClick={() => props.setExpandedFlight(null)}
                >
                    <h2 className="hidden md:block">
                        {props.flight.code + props.flight.number}
                    </h2>
                    <h3 className="block md:hidden">
                        {props.flight.code + props.flight.number}
                    </h3>
                </div>
                <div className="text-left">{props.flight.departureAirport}</div>
                <div className="text-left">{props.flight.arrivalAirport}</div>
                <div className="text-left">
                    {props.flight.departureTime} - {props.flight.arrivalTime}
                </div>
                <div className="text-left">
                    {DecDurToStr(props.flight.flightTime)}
                </div>
                <div className="text-left col-span-2">
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
                                                props.aircraft,
                                            ),
                                        );
                                    }}
                                    value={aircraft?.id ?? ""}
                                    className="border text-sm rounded-lg block w-full"
                                >
                                    {props.flight.aircraft
                                        .map((a) =>
                                            GetAircraft(a, props.aircraft),
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
                                <div>
                                    {props.pluginSettings
                                        ?.allow_fleet_substitution !== false ||
                                    props.pluginSettings
                                        .allow_any_aircraft_in_fleet !==
                                        false ? (
                                        <select
                                            onChange={(e) => {
                                                setAircraft(
                                                    GetAircraft(
                                                        e.target.value,
                                                        props.aircraft,
                                                    ),
                                                );
                                            }}
                                            value={aircraft?.id ?? ""}
                                            className="border text-sm rounded-lg block w-full"
                                        >
                                            {props.aircraft.map((a) => (
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
                    )}
                </div>
                <div className="flex items-center justify-end px-3 col-span-2">
                    {props.flight.bidID &&
                        props.currentFlightData?.bidID !==
                            props.flight.bidID && (
                            <button
                                className="button button-hollow float-right ml-3 mb-1 mt-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    props.unbookFlight(props.flight.bidID);
                                }}
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        )}
                    {recoverable &&
                        (!!!props.currentFlightData ||
                            props.currentFlightData.state?.status ===
                                "CONN_LOSS") && (
                            <button
                                onClick={restoreFlight}
                                className="button button-solid float-right ml-3 mb-1 mt-1"
                                data-tooltip-id={`bid-${
                                    props.flight.bidID
                                        ? props.flight.bidID
                                        : props.flight.id
                                }`}
                                data-tooltip-content="Restore this flight with smartCARS Pro"
                            >
                                <FontAwesomeIcon icon={faCloudArrowDown} />
                            </button>
                        )}

                    {((props.currentFlightData &&
                        props.currentFlightData.bidID === props.flight.bidID) ||
                        (props.currentFlightData &&
                            props.currentFlightData?.flightPlanData?.number ===
                                `${
                                    props.flight.code + props.flight.number
                                }`)) &&
                        props.currentFlightData &&
                        props.currentFlightData.state?.status !==
                            "CONN_LOSS" && (
                            <div
                                className="h-2 w-full rounded"
                                style={{
                                    backgroundColor:
                                        "var(--background-accent-color)",
                                }}
                                data-tooltip-id={`bid-${
                                    props.flight.bidID
                                        ? props.flight.bidID
                                        : props.flight.id
                                }`}
                                data-tooltip-content={`Flight in progress with ${Math.round(
                                    props.currentFlightData.distanceToGo / 1852,
                                )}nm to go`}
                            >
                                <div
                                    className="h-2 background-accent-bkg rounded"
                                    style={{
                                        width: `${Math.round(
                                            (props.currentFlightData
                                                .distanceFlown /
                                                (props.currentFlightData
                                                    .distanceFlown +
                                                    props.currentFlightData
                                                        .distanceToGo)) *
                                                100,
                                        )}%`,
                                    }}
                                ></div>
                            </div>
                        )}

                    {props.currentFlightData &&
                        props.currentFlightData.bidID ===
                            props.flight.bidID && (
                            <button
                                onClick={() =>
                                    localApi("api/navigate", "POST", {
                                        pluginID:
                                            "com.tfdidesign.flight-tracking",
                                    })
                                }
                                className="button button-solid float-right ml-3 mb-1 mt-1"
                                data-tooltip-id={`bid-${
                                    props.flight.bidID
                                        ? props.flight.bidID
                                        : props.flight.id
                                }`}
                                data-tooltip-content="Go to flight-tracking"
                            >
                                <FontAwesomeIcon icon={faCompass} />
                            </button>
                        )}

                    {props.simBriefInstalled && !!!props.currentFlightData && (
                        <button
                            onClick={planWithSimBrief}
                            className="button button-solid float-right ml-3 mb-1 mt-1"
                            data-tooltip-id={`bid-${
                                props.flight.bidID
                                    ? props.flight.bidID
                                    : props.flight.id
                            }`}
                            data-tooltip-content="Plan with SimBrief"
                        >
                            <FontAwesomeIcon icon={faRoute} />
                        </button>
                    )}
                    {!props.currentFlightData && (
                        <button
                            onClick={flyFlight}
                            className="button button-solid float-right ml-3 mb-1 mt-1"
                            data-tooltip-id={`bid-${
                                props.flight.bidID
                                    ? props.flight.bidID
                                    : props.flight.id
                            }`}
                            data-tooltip-content="Fly this flight"
                        >
                            <FontAwesomeIcon icon={faPlaneDeparture} />
                        </button>
                    )}
                    {!props.flight.bidID &&
                        !(
                            props.currentFlightData &&
                            props.currentFlightData?.flightPlanData?.number ===
                                `${props.flight.code + props.flight.number}`
                        ) && (
                            <button
                                onClick={bidFlight}
                                className="button button-solid float-right ml-3 mb-1 mt-1"
                                data-tooltip-id={`bid-${
                                    props.flight.bidID
                                        ? props.flight.bidID
                                        : props.flight.id
                                }`}
                                data-tooltip-content="Bid on this flight"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        )}
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
                <Tooltip
                    id={`bid-${
                        props.flight.bidID
                            ? props.flight.bidID
                            : props.flight.id
                    }`}
                />
            </div>
        );
    } else {
        return (
            <div
                className="grid grid-cols-10 items-center data-table-row p-3 mt-3 select interactive-shadow"
                onClick={() =>
                    props.setExpandedFlight(
                        props.flight.bidID
                            ? props.flight.bidID
                            : props.flight.id,
                    )
                }
            >
                <div className="text-left col-span-2">
                    {props.flight.code + props.flight.number}
                </div>
                <div className="text-left">{props.flight.departureAirport}</div>
                <div className="text-left">{props.flight.arrivalAirport}</div>
                <div className="text-left">
                    {props.flight.departureTime} - {props.flight.arrivalTime}
                </div>
                <div className="text-left">
                    {DecDurToStr(props.flight.flightTime)}
                </div>
                <div
                    className="text-left col-span-2"
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
                                                props.aircraft,
                                            ),
                                        );
                                    }}
                                    value={aircraft?.id ?? ""}
                                    className="border text-sm rounded-lg block w-full"
                                >
                                    {props.flight.aircraft
                                        .map((a) =>
                                            GetAircraft(a, props.aircraft),
                                        )
                                        .filter((a) => !!a)
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
                                <div>
                                    {props.pluginSettings
                                        ?.allow_fleet_substitution !== false ||
                                    props.pluginSettings
                                        .allow_any_aircraft_in_fleet !==
                                        false ? (
                                        <select
                                            onChange={(e) => {
                                                setAircraft(
                                                    GetAircraft(
                                                        e.target.value,
                                                        props.aircraft,
                                                    ),
                                                );
                                            }}
                                            value={aircraft?.id ?? ""}
                                            className="border text-sm rounded-lg block w-full"
                                        >
                                            {props.aircraft.map((a) => (
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
                    )}
                </div>
                <div className="flex items-center justify-end px-3 col-span-2">
                    {props.flight.bidID &&
                        props.currentFlightData?.bidID !==
                            props.flight.bidID && (
                            <button
                                className="button button-hollow float-right ml-3 mb-1 mt-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    props.unbookFlight(props.flight.bidID);
                                }}
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        )}
                    {recoverable &&
                        (!!!props.currentFlightData ||
                            props.currentFlightData.state?.status ===
                                "CONN_LOSS") && (
                            <button
                                onClick={restoreFlight}
                                className="button button-solid float-right ml-3 mb-1 mt-1"
                                data-tooltip-id={`bid-${
                                    props.flight.bidID
                                        ? props.flight.bidID
                                        : props.flight.id
                                }`}
                                data-tooltip-content="Restore this flight with smartCARS Pro"
                            >
                                <FontAwesomeIcon icon={faCloudArrowDown} />
                            </button>
                        )}

                    {((props.currentFlightData &&
                        props.currentFlightData.bidID === props.flight.bidID) ||
                        (props.currentFlightData &&
                            props.currentFlightData?.flightPlanData?.number ===
                                `${
                                    props.flight.code + props.flight.number
                                }`)) &&
                        props.currentFlightData &&
                        props.currentFlightData.state?.status !==
                            "CONN_LOSS" && (
                            <div
                                className="h-2 w-full rounded"
                                style={{
                                    backgroundColor:
                                        "var(--background-accent-color)",
                                }}
                                data-tooltip-id={`bid-${
                                    props.flight.bidID
                                        ? props.flight.bidID
                                        : props.flight.id
                                }`}
                                data-tooltip-content={`Flight in progress with ${Math.round(
                                    props.currentFlightData.distanceToGo / 1852,
                                )}nm to go`}
                            >
                                <div
                                    className="h-2 background-accent-bkg rounded"
                                    style={{
                                        width: `${Math.round(
                                            (props.currentFlightData
                                                .distanceFlown /
                                                (props.currentFlightData
                                                    .distanceFlown +
                                                    props.currentFlightData
                                                        .distanceToGo)) *
                                                100,
                                        )}%`,
                                    }}
                                ></div>
                            </div>
                        )}

                    {props.currentFlightData &&
                        props.currentFlightData.bidID ===
                            props.flight.bidID && (
                            <button
                                onClick={() =>
                                    localApi("api/navigate", "POST", {
                                        pluginID:
                                            "com.tfdidesign.flight-tracking",
                                    })
                                }
                                className="button button-solid float-right ml-3 mb-1 mt-1"
                                data-tooltip-id={`bid-${
                                    props.flight.bidID
                                        ? props.flight.bidID
                                        : props.flight.id
                                }`}
                                data-tooltip-content="Go to flight-tracking"
                            >
                                <FontAwesomeIcon icon={faCompass} />
                            </button>
                        )}

                    {props.simBriefInstalled && !!!props.currentFlightData && (
                        <button
                            onClick={planWithSimBrief}
                            className="button button-solid float-right ml-3 mb-1 mt-1"
                            data-tooltip-id={`bid-${
                                props.flight.bidID
                                    ? props.flight.bidID
                                    : props.flight.id
                            }`}
                            data-tooltip-content="Plan with SimBrief"
                        >
                            <FontAwesomeIcon icon={faRoute} />
                        </button>
                    )}
                    {!props.currentFlightData && (
                        <button
                            onClick={flyFlight}
                            className="button button-solid float-right ml-3 mb-1 mt-1"
                            data-tooltip-id={`bid-${
                                props.flight.bidID
                                    ? props.flight.bidID
                                    : props.flight.id
                            }`}
                            data-tooltip-content="Fly this flight"
                        >
                            <FontAwesomeIcon icon={faPlaneDeparture} />
                        </button>
                    )}
                    {!props.flight.bidID &&
                        !(
                            props.currentFlightData &&
                            props.currentFlightData?.flightPlanData?.number ===
                                `${props.flight.code + props.flight.number}`
                        ) && (
                            <button
                                onClick={bidFlight}
                                className="button button-solid float-right ml-3 mb-1 mt-1"
                                data-tooltip-id={`bid-${
                                    props.flight.bidID
                                        ? props.flight.bidID
                                        : props.flight.id
                                }`}
                                data-tooltip-content="Bid on this flight"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        )}
                </div>
                <Tooltip
                    id={`bid-${
                        props.flight.bidID
                            ? props.flight.bidID
                            : props.flight.id
                    }`}
                />
            </div>
        );
    }
};

export default Flight;
