function GetAirport(airportCode, airports) {
    let code = airportCode.trim();
    return airports.find((airport) => airport.code === code) || null;
}

function GetAircraft(aircraftID, aircrafts) {
    return (
        aircrafts.find(
            (aircraft) => Number(aircraft.id) === Number(aircraftID),
        ) || null
    );
}

function GetAirportName(airportCode, airports) {
    const airport = airports.find((airport) => airport.code === airportCode);

    if (!airport) {
        return airportCode;
    }

    return airport.name;
}

function GetAircraftName(aircraftID, aircrafts) {
    const aircraft = aircrafts.find(
        (aircraft) => Number(aircraft.id) === Number(aircraftID),
    );

    if (!aircraft) {
        return "ID " + aircraftID;
    }

    return aircraft.name;
}

function DecDurToStr(dec) {
    let hours = Math.floor(dec);
    let mins = (dec - hours) * 60;

    while (mins >= 60) {
        hours += 1;
        mins -= 60;
    }

    if (hours === 0 && mins === 0) return "N/A";

    hours = parseInt(hours);
    mins = parseInt(mins);

    return `${hours.toString().padStart(2, "0")}h ${mins
        .toString()
        .padStart(2, "0")}m`;
}

export {
    GetAircraftName,
    GetAirportName,
    DecDurToStr,
    GetAircraft,
    GetAirport,
};
