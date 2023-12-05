/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { request, notify, localApi } from "@tfdidesign/smartcars3-ui-sdk";
import { useEffect } from "react";
import Loading from "../components/loading";
import Autocomplete from "../components/autocomplete";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLeft } from "@fortawesome/pro-solid-svg-icons";

const baseUrl = "http://localhost:7172/api/com.tfdidesign.flight-center/";

const CreateFlightContents = ({ airportsList, aircrafts, identity }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [airports, setAirports] = useState([]);

    const [depApt, setDepApt] = useState("");
    const [arrApt, setArrApt] = useState("");
    const [aircraft, setAircraft] = useState("");
    const [callsign, setCallsign] = useState("");
    const [cruiseAlt, setCruiseAlt] = useState("");
    const [flightType, setFlightType] = useState("");
    const [depHour, setDepHour] = useState("");
    const [depMin, setDepMin] = useState("");
    const [arrHour, setArrHour] = useState("");
    const [arrMin, setArrMin] = useState("");
    const [route, setRoute] = useState("");
    const [simBriefInstalled, setSimBriefInstalled] = useState(false);
    const [settings, setSettings] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const list = airportsList.map(
            (airport) => `${airport.code} - ${airport.name}`,
        );

        setAirports(list);
        isSimBriefInstalled();
        getSettings();
    }, [airportsList]);

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

    async function createFlight() {
        setIsLoading(true);
        try {
            const depCode = depApt.slice(0, 4).toUpperCase().trim();
            const arrCode = arrApt.slice(0, 4).toUpperCase().trim();

            const formatNum = (num) => `${num.toString().padStart(2, "0")}`;

            await request({
                url: `${baseUrl}create-flight`,
                method: "POST",
                data: {
                    number: callsign,
                    departure: depCode,
                    arrival: arrCode,
                    route: route.split(" "),
                    aircraft: aircraft,
                    cruise: cruiseAlt,
                    type: flightType,
                    departureTime: `${formatNum(depHour)}:${formatNum(depMin)}`,
                    arrivalTime: `${formatNum(arrHour)}:${formatNum(arrMin)}`,
                },
            });

            notify("com.tfdidesign.flight-center", null, null, {
                message: "Flight created",
                type: "success",
            });

            navigate("/");
        } catch (error) {
            notify("com.tfdidesign.flight-center", null, null, {
                message: "Failed to create flight",
                type: "danger",
            });
        }

        setIsLoading(false);
    }

    async function getSettings() {
        try {
            const response = await request({
                url: "http://localhost:7172/api/settings",
                method: "GET",
            });

            setSettings(response);
        } catch (error) {}
    }

    async function loadFromSimBrief() {
        if (!simBriefInstalled) return;

        if (
            !settings ||
            !settings["com.tfdidesign.simbrief"] ||
            !settings["com.tfdidesign.simbrief"].simbriefUsername
        ) {
            notify("com.tfdidesign.flight-center", null, null, {
                message: "SimBrief username not set",
                type: "danger",
            });
            return;
        }

        const response = await localApi(
            "api/com.tfdidesign.simbrief/fetchplan",
            "POST",
            {
                simBriefUsername:
                    settings["com.tfdidesign.simbrief"].simbriefUsername,
            },
        );

        setDepApt(response.flightPlan.origin.icao_code);
        setArrApt(response.flightPlan.destination.icao_code);
        setCallsign(
            response.flightPlan.general.icao_airline +
                response.flightPlan.general.flight_number,
        );
        setFlightType(
            Number(response.flightPlan.general.passengers) > 0 ? "P" : "C",
        );
        setCruiseAlt(response.flightPlan.general.initial_altitude);
        setRoute(
            `${response.flightPlan.origin.icao_code} ${response.flightPlan.general.route} ${response.flightPlan.destination.icao_code}`,
        );
        setDepHour(
            ((Number(response.flightPlan.times.est_out) % 86400) -
                (Number(response.flightPlan.times.est_out) % 3600)) /
                3600,
        );
        setDepMin(
            ((Number(response.flightPlan.times.est_out) % 3600) -
                (Number(response.flightPlan.times.est_out) % 60)) /
                60,
        );
        setArrHour(
            ((Number(response.flightPlan.times.est_in) % 86400) -
                (Number(response.flightPlan.times.est_in) % 3600)) /
                3600,
        );
        setArrMin(
            ((Number(response.flightPlan.times.est_in) % 3600) -
                (Number(response.flightPlan.times.est_in) % 60)) /
                60,
        );
    }

    if (!airportsList || !aircrafts) return <></>;

    return (
        <form
            className="root-container p-8 py-0"
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                createFlight();
            }}
        >
            <div className="mb-3">
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
                                        Charter a Flight
                                    </h2>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mb-3">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="mb-3 md:pr-1">
                        <input
                            required
                            id="callsignBox"
                            type="text"
                            placeholder="Callsign"
                            value={callsign}
                            onChange={(e) => {
                                setCallsign(e.target.value);
                            }}
                            className="color-accent-bkg font-bold text-2xl"
                        />
                    </div>
                    <div />

                    <div>
                        <div className="md:pr-1">
                            <select
                                required
                                value={aircraft}
                                className="mb-3 md:mb-0"
                                onChange={(e) => {
                                    setAircraft(e.target.value);
                                }}
                            >
                                <option value="">Select Aircraft</option>
                                {aircrafts.map((ac) => {
                                    return (
                                        <option key={ac.id} value={ac.id}>
                                            {ac.name}
                                            {!!ac.registration
                                                ? " (" + ac.registration + ")"
                                                : null}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2">
                        <div className="md:pl-1 pr-1">
                            <select
                                required
                                value={flightType}
                                onChange={(e) => {
                                    setFlightType(e.target.value);
                                }}
                            >
                                <option value="">Flight Type</option>
                                <option value="P">Passenger</option>
                                <option value="C">Cargo</option>
                            </select>
                        </div>

                        <div className="pl-1">
                            <input
                                type="number"
                                required
                                placeholder="Cruising Altitude"
                                value={cruiseAlt}
                                onChange={(e) => setCruiseAlt(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <h4>ITINERARY</h4>

            <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="grid grid-cols-2">
                    <Autocomplete
                        placeholder="Departure Airport"
                        options={airports}
                        value={depApt}
                        onChange={(e) => {
                            setDepApt(e);
                        }}
                        required={true}
                    />
                    <div className="flex place-items-center justify-evenly">
                        <span className="px-1">@</span>
                        <input
                            type="number"
                            placeholder="HH"
                            value={depHour}
                            min={0}
                            max={23}
                            required
                            onChange={(e) => {
                                setDepHour(e.target.value);
                            }}
                        />
                        <span className="px-1">:</span>
                        <input
                            type="number"
                            className="md:mr-1"
                            placeholder="MM"
                            value={depMin}
                            min={0}
                            max={59}
                            required
                            onChange={(e) => {
                                setDepMin(e.target.value);
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 mt-3 md:mt-0">
                    <div className="md:ml-1">
                        <Autocomplete
                            placeholder="Arrival Airport"
                            options={airports}
                            value={arrApt}
                            onChange={(e) => setArrApt(e)}
                            required={true}
                        />
                    </div>
                    <div className="flex place-items-center justify-evenly">
                        <span className="px-1">@</span>
                        <input
                            type="number"
                            placeholder="HH"
                            value={arrHour}
                            min={0}
                            max={23}
                            required
                            onChange={(e) => {
                                setArrHour(e.target.value);
                            }}
                        />
                        <span className="px-1">:</span>
                        <input
                            type="number"
                            placeholder="MM"
                            value={arrMin}
                            min={0}
                            max={59}
                            required
                            onChange={(e) => {
                                setArrMin(e.target.value);
                            }}
                        />
                    </div>
                </div>

                <div className="mt-3 md:col-span-2">
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

            {identity?.airline?.id === -1 ? (
                <input
                    onClick={() => {
                        localApi("api/navigate", "POST", {
                            pluginID: "com.tfdidesign.fleet-manager",
                            payloadString: "new",
                        });
                    }}
                    type="button"
                    className="button button-solid float-left mr-3 mt-3"
                    value="ADD AIRCRAFT"
                />
            ) : null}

            <div className="float-right flex ml-3 mt-3">
                {simBriefInstalled && (
                    <input
                        type="button"
                        className="button button-solid mr-3"
                        value="Import from SimBrief"
                        onClick={loadFromSimBrief}
                    />
                )}

                <input
                    type="submit"
                    className="button button-solid"
                    value="Create"
                />
            </div>
            {isLoading ? <Loading /> : null}
        </form>
    );
};

const CreateFlight = ({ identity }) => {
    const [airports, setAirports] = useState([]);
    const [aircraft, setAircraft] = useState([]);

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
        <CreateFlightContents
            airportsList={airports}
            aircrafts={aircraft}
            identity={identity}
        />
    );
};

export default CreateFlight;
