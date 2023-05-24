import React, { useEffect, useRef, useState } from "react";

export default function Autocomplete({
    options,
    value,
    onChange,
    placeholder,
    required = false,
}) {
    const [showOptions, setShowOptions] = useState(false);
    const [cursor, setCursor] = useState(-1);
    const ref = useRef();

    const select = (option) => {
        onChange(option);
        setShowOptions(false);
    };

    const handleChange = (text) => {
        onChange(text);
        setCursor(-1);
        if (!showOptions) {
            setShowOptions(true);
        }
    };

    const filteredOptions = options
        .filter((option) => option.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);

    const moveCursorDown = () => {
        if (cursor < filteredOptions.length - 1) {
            setCursor((c) => c + 1);
        }
    };

    const moveCursorUp = () => {
        if (cursor > 0) {
            setCursor((c) => c - 1);
        }
    };

    const handleNav = (e) => {
        switch (e.key) {
            case "ArrowUp":
                moveCursorUp();
                break;
            case "ArrowDown":
                moveCursorDown();
                break;
            case "Enter":
                if (cursor >= 0 && cursor < filteredOptions.length) {
                    select(filteredOptions[cursor]);
                }
                break;
            default:
                break;
        }
    };

    useEffect(() => {
        const listener = (e) => {
            if (!ref.current.contains(e.target)) {
                setShowOptions(false);
                setCursor(-1);
            }
        };

        document.addEventListener("click", listener);
        document.addEventListener("focusin", listener);
        return () => {
            document.removeEventListener("click", listener);
            document.removeEventListener("focusin", listener);
        };
    }, []);

    return (
        <div className="relative w-full h-full" ref={ref}>
            <input
                type="text"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={() => setShowOptions(true)}
                onKeyDown={handleNav}
                placeholder={placeholder}
                required={required}
            />

            <ul
                className={`absolute w-full rounded shadow-lg z-10 ${
                    !showOptions && "hidden"
                } select-none background-color`}
            >
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((option, i, arr) => {
                        let className = "px-4 ";

                        if (i === 0) {
                            className += "pt-2 pb-1";
                        } else if (i === arr.length) {
                            className += "pt-1 pb-2";
                        } else if (i === 0 && arr.length === 1) {
                            className += "py-2";
                        } else {
                            className += "py-1";
                        }

                        return (
                            <li
                                className={`cursor-pointer m-1 hover:underline ${className}`}
                                key={option}
                                onClick={() => select(option)}
                            >
                                {option}
                            </li>
                        );
                    })
                ) : (
                    <li className="px-4 py-2">No results</li>
                )}
            </ul>
        </div>
    );
}
