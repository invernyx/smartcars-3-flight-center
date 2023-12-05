const axios = __non_webpack_require__("axios");
const { log } = require("@tfdidesign/smartcars3-background-sdk");

let scIdentity = null;
let config = null;
let cache = {
    flights: {},
    airports: {},
    aircrafts: {},
    bookings: {},
};

const getCache = (endpoint, key, req) => {
    if (
        req &&
        req.query &&
        (req.query.nocache == "true" || req.query.nocache == true)
    ) {
        return null;
    }

    const entry = cache[endpoint][key];

    if (entry) {
        // 5 minutes
        if (entry.timestamp + 30000 > Date.now()) {
            return entry.data;
        }
        delete cache[endpoint][key];
    }
    return null;
};

const storeCache = (endpoint, key, data) => {
    cache[endpoint][key] = {
        timestamp: Date.now(),
        data,
    };
};

const getAirports = async (req) => {
    const entry = getCache("airports", "data", req);

    if (!!entry) {
        return entry;
    }

    const response = await axios({
        url: `${scIdentity.airline.settings.scriptURL}data/airports`,
        method: "GET",
        headers: {
            Authorization: `Bearer ${scIdentity.va_user.session}`,
        },
    });

    storeCache("airports", "data", response.data);
    return response.data;
};

const getAircrafts = async (req) => {
    const entry = getCache("aircrafts", "data", req);

    if (!!entry) {
        return entry;
    }

    const response = await axios({
        url: `${scIdentity.airline.settings.scriptURL}data/aircraft`,
        method: "GET",
        headers: {
            Authorization: `Bearer ${scIdentity.va_user.session}`,
        },
    });

    storeCache("aircrafts", "data", response.data);
    return response.data;
};

module.exports = {
    onStart: async (identity) => {
        scIdentity = identity;

        try {
            const res = await axios.get("http://localhost:7172/api/config");
            config = res.data.config;

            await getAirports(null);
            await getAircrafts(null);
        } catch (err) {
            log("Error while getting config", "error", err);
        }
    },
    routes: {
        get: {
            flights: {
                description: "Endpoint to list flights",
                handler: async (req, res) => {
                    const {
                        departure,
                        arrival,
                        minDist,
                        maxDist,
                        minDur,
                        maxDur,
                        callsign,
                        aircraft,
                    } = req.query;

                    const entry = getCache(
                        "flights",
                        `${departure}-${arrival}-${minDist}-${maxDist}-${minDur}-${maxDur}-${callsign}-${aircraft}`,
                        req,
                    );

                    if (entry) {
                        return res.json(entry);
                    }

                    try {
                        let params = {};
                        if (
                            departure !== undefined &&
                            departure !== null &&
                            departure !== ""
                        )
                            params.departureAirport = departure;
                        if (
                            arrival !== undefined &&
                            arrival !== null &&
                            arrival !== ""
                        )
                            params.arrivalAirport = arrival;
                        if (minDur !== undefined && minDur !== null)
                            params.minimumFlightTime = minDur;
                        if (maxDur !== undefined && maxDur !== null)
                            params.maximumFlightTime = maxDur;
                        if (minDist !== undefined && minDist !== null)
                            params.minimumDistance = minDist;
                        if (maxDist !== undefined && maxDist !== null)
                            params.maximumDistance = maxDist;
                        if (callsign !== undefined && callsign !== null)
                            params.callsign = callsign;
                        if (aircraft !== undefined && aircraft !== null)
                            params.aircraft = aircraft;

                        const response = await axios({
                            url: `${scIdentity.airline.settings.scriptURL}flights/search`,
                            method: "GET",
                            params: params,
                            headers: {
                                Authorization: `Bearer ${scIdentity.va_user.session}`,
                            },
                        });

                        storeCache(
                            "flights",
                            `${departure}-${arrival}-${minDist}-${maxDist}-${minDur}-${maxDur}-${callsign}-${aircraft}`,
                            response.data,
                        );

                        return res.json(response.data);
                    } catch (error) {
                        log("Error while getting flight list", "error", error);
                        return res.status(500).json({});
                    }
                },
            },
            bookings: {
                description: "Endpoint to list bookings",
                handler: async (req, res) => {
                    const entry = getCache("bookings", "data", req);

                    if (entry) {
                        return res.json(entry);
                    }

                    try {
                        const response = await axios({
                            url: `${scIdentity.airline.settings.scriptURL}flights/bookings`,
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${scIdentity.va_user.session}`,
                            },
                        });

                        storeCache("bookings", "data", response.data);

                        return res.json(response.data);
                    } catch (error) {
                        log("Error while getting booking list", "error", error);
                        return res.status(500).json({});
                    }
                },
            },
            airports: {
                description: "Endpoint to list airports",
                handler: async (req, res) => {
                    try {
                        const airports = await getAirports(req);

                        return res.json(airports);
                    } catch (error) {
                        log("Error while getting airport list", "error", error);
                        return res.status(500).json({});
                    }
                },
            },
            aircrafts: {
                description: "Endpoint to list aircrafts",
                handler: async (req, res) => {
                    try {
                        const aircraft = await getAircrafts(req);

                        return res.json(aircraft);
                    } catch (error) {
                        log(
                            "Error while getting aircraft list",
                            "error",
                            error,
                        );
                        return res.status(500).json({});
                    }
                },
            },
            recover: {
                description: "Find the data of a flight to recover",
                handler: async (req, res) => {
                    if (!config) {
                        return res.status(404).json({});
                    }
                    if (
                        !scIdentity ||
                        !scIdentity.tfdi_design_user ||
                        !scIdentity.tfdi_design_user.id ||
                        !scIdentity.tfdi_design_user.hasPremium
                    ) {
                        return res.status(404).json({});
                    }

                    try {
                        const recoveryFlight = await axios.post(
                            `${config.privateAPI}flight/recover`,
                            {
                                userID: scIdentity.tfdi_design_user.id,
                                token: scIdentity.tfdi_design_user.token,
                            },
                        );

                        if (recoveryFlight.data) {
                            return res.json(recoveryFlight.data);
                        }
                    } catch (error) {
                        // Ignore errors
                    }
                    return res.status(404).json({});
                },
            },
            recoverable: {
                description:
                    "Find if there is a Pro flight that can be recovered",
                handler: async (req, res) => {
                    if (!config) {
                        return res.status(404).json({});
                    }
                    if (
                        !scIdentity ||
                        !scIdentity.tfdi_design_user ||
                        !scIdentity.tfdi_design_user.id ||
                        !scIdentity.tfdi_design_user.hasPremium
                    ) {
                        return res.status(404).json({});
                    }

                    try {
                        const recoveryFlight = await axios.post(
                            `${config.privateAPI}flight/recoverable`,
                            {
                                userID: scIdentity.tfdi_design_user.id,
                                token: scIdentity.tfdi_design_user.token,
                            },
                        );

                        if (recoveryFlight.data) {
                            return res.json(recoveryFlight.data);
                        }
                    } catch (error) {
                        // Ignore errors
                    }
                    return res.status(404).json({});
                },
            },
        },
        post: {
            "create-flight": {
                description: "Endpoint to create a flight",
                handler: async (req, res) => {
                    try {
                        const response = await axios({
                            url: `${scIdentity.airline.settings.scriptURL}flights/charter`,
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${scIdentity.va_user.session}`,
                            },
                            data: {
                                airlineID: scIdentity.airline.id,
                                ...req.body,
                            },
                        });

                        return res.json(response.data);
                    } catch (error) {
                        log("Error while creating flight", "error", error);
                        return res.status(500).json({});
                    }
                },
            },
            "unbook-flight": {
                description: "Endpoint to unbook a flight",
                handler: async (req, res) => {
                    const { bidID } = req.body;

                    try {
                        await axios({
                            url: `${scIdentity.airline.settings.scriptURL}flights/unbook`,
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${scIdentity.va_user.session}`,
                            },
                            data: {
                                bidID: Number(bidID),
                            },
                        });

                        return res.json({});
                    } catch (error) {
                        log("Error while unbooking flight", "error", error);
                        return res.status(500).json({});
                    }
                },
            },
            "book-flight": {
                description: "Endpoint to book a flight",
                handler: async (req, res) => {
                    const { flightID } = req.body;

                    try {
                        const response = await axios({
                            url: `${scIdentity.airline.settings.scriptURL}flights/book`,
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${scIdentity.va_user.session}`,
                            },
                            data: {
                                flightID: flightID,
                            },
                        });

                        return res.json(response.data);
                    } catch (error) {
                        log("Error while booking flight", "error", error);
                        return res.status(500).json({});
                    }
                },
            },
        },
    },
};
