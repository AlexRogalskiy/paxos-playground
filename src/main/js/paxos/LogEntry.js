export class LogEntry {
	// _value;
	// _entryType;

	constructor(value, entryType = EntryType.APPLICATION_LEVEL) {
		this._value = value;
		this._entryType = entryType;
	}

	get value() {
		return this._value;
	}

	get entryType() {
		return this._entryType;
	}

	static equals(a, b) {
		if (a === b) {
			return true;
		} else if (a === undefined || b === undefined) {
			return false;
		} else {
			return a.value === b.value && a.entryType === b.entryType;
		}
	}
}

export const EntryType = {
	APPLICATION_LEVEL: Symbol("application_level"),
	ELECTION: Symbol("election"),
	CONFIG_CHANGE: Symbol("config_change")
};
