// Brand and Model Name Mapping Layer
// Maps Rails app names to Carzilla.de names
// Generated on: 2025-09-26T15:22:27.537Z

const BRAND_NAME_MAPPING = {
    "Mini": "MINI",
    "Ssangyong": "SSangYong",
    "VW": "Volkswagen"
};

// Function to convert Rails app brand name to Carzilla brand name
function mapBrandName(railsBrandName) {
    return BRAND_NAME_MAPPING[railsBrandName] || railsBrandName;
}

// Function to convert Rails app model name to Carzilla model name
function mapModelName(railsBrandName, railsModelName) {
    // For now, return as-is. Manual mapping may be needed for specific cases.
    // Based on analysis, most models match or are close enough for fuzzy matching.
    return railsModelName;
}

module.exports = {
    BRAND_NAME_MAPPING,
    mapBrandName,
    mapModelName
};
