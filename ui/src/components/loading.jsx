import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/pro-solid-svg-icons";

export default function Loading() {
    return (
        <div className="modal-background">
            <div className="loading grid h-screen place-items-center">
                <FontAwesomeIcon
                    icon={faSpinner}
                    className="animate-spin"
                    size="10x"
                />
            </div>
        </div>
    );
}
