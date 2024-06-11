const vscode = acquireVsCodeApi();

// Listen for issues
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'updateIssues':
            const issues = message.issues;
            const categoryCounts = message.categoryCounts;

            recreateIssues(issues);
            recreateFilters(categoryCounts);
            recreateListeners();
            break;
    }
});

function refreshIssueList(filterKey = undefined, filterValue = undefined) {
    vscode.postMessage({ command: 'getIssues', filterKey: filterKey, filterValue: filterValue });
}

function recreateIssues(issues) {
    const issuesDiv = document.getElementById('issues');
    issuesDiv.innerHTML = getIssueHtml(issues);
}

async function recreateListeners() {
    const fileNameWrappers = document.querySelectorAll('.filename-wrapper');
    fileNameWrappers.forEach(fw => {
        fw.addEventListener('click', () => {
            fw.parentNode.classList.toggle('expanded');

            let iconClasses = fw.parentNode.getElementsByTagName("i")[0].classList;
            iconClasses.toggle('fa-chevron-down');
            iconClasses.toggle('fa-chevron-right')
        });
    });


    const issueContainers = document.querySelectorAll('.issue-container');
    for (const ic of issueContainers) {
        ic.addEventListener('click', async (event) => {
            if (ic.hasAttribute('data-file-uri')) {
                const filePath = ic.dataset.fileUri;
                const lineNumber = parseInt(ic.dataset.lineNumber, 0);
                vscode.postMessage({
                    command: 'openFileAtLocation',
                    filePath: filePath,
                    lineNumber: lineNumber
                });
            }
        });
    }
}

// Filter scripts
function recreateFilters(categoryCounts) {
    document.getElementById(RuleType.BUG.id).innerHTML = RuleType.BUG.name + " (" + categoryCounts[RuleType.BUG.id]+ ")";
    document.getElementById(RuleType.CODE_SMELL.id).innerHTML = RuleType.CODE_SMELL.name + " (" + categoryCounts[RuleType.CODE_SMELL.id]+ ")";
    document.getElementById(RuleType.VULNERABILITY.id).innerHTML = RuleType.VULNERABILITY.name + " (" + categoryCounts[RuleType.VULNERABILITY.id]+ ")";

    document.getElementById(IssueSeverity.BLOCKER.id).innerHTML = IssueSeverity.BLOCKER.name + " (" + categoryCounts[IssueSeverity.BLOCKER.id]+ ")";
    document.getElementById(IssueSeverity.CRITICAL.id).innerHTML = IssueSeverity.CRITICAL.name + " (" + categoryCounts[IssueSeverity.CRITICAL.id]+ ")";
    document.getElementById(IssueSeverity.MAJOR.id).innerHTML = IssueSeverity.MAJOR.name + " (" + categoryCounts[IssueSeverity.MAJOR.id]+ ")";
    document.getElementById(IssueSeverity.MINOR.id).innerHTML = IssueSeverity.MINOR.name + " (" + categoryCounts[IssueSeverity.MINOR.id]+ ")";
    document.getElementById(IssueSeverity.INFO.id).innerHTML = IssueSeverity.INFO.name + " (" + categoryCounts[IssueSeverity.INFO.id]+ ")";

    document.getElementById('SEVERITY-ALL').innerHTML = 'All' + " (" + categoryCounts['SEVERITY-ALL']+ ")";
    document.getElementById('RULETYPE-ALL').innerHTML = 'All' + " (" + categoryCounts['RULETYPE-ALL']+ ")";
}

// Static HTML
function getIssueHtml(issueMap) {
    if (!issueMap) return '';

    let html = '';
    for (const fileUri in issueMap) {
        if (Object.keys(issueMap[fileUri].issues).length === 0) continue;

        let fileInfo = issueMap[fileUri];
        let childrenHtml = '';
        for (const issue of fileInfo.issues) {
            let icons = getIconsForIssue(issue);

            childrenHtml +=
                `<div class="issue-container" data-file-uri=${fileUri} data-line-number=${issue.range.start.line}>
                    <div class="icon">
                        <i class="fa fa-${icons.severityIcon.icon} fa-fw" title="Severity: ${issue.issueSeverity}" style="color:${icons.severityIcon.color}; padding: 1dp;"></i>
                        <i class="fa fa-${icons.ruleTypeIcon.icon} fa-fw" title="Type: ${issue.ruleType}" style="color:${icons.ruleTypeIcon.color}; padding: 1dp;"></i>
                    </div>
                    <div class="left-div">
                        ${issue.message}
                    </div>
                    <div class="right-div">
                        ${issue.source}(${issue.code}) [Ln ${issue.range.start.line + 1}, Col ${issue.range.start.character + 1}]
                    </div>
                </div>\n`
        }

        html +=
            `<div class="expandable expanded">
                <div class="filename-wrapper">
                    <i class="fa fa-chevron-down" style="font-size: 10px; margin-right: 4px;"></i>
                    <span>${fileInfo.fileName}</span>
                    <span class="filepath-wrapper">${fileInfo.fileRelativePath}</span>
                </div>
                <div class="children">
                    ${childrenHtml}
                </div>
            </div>\n`
    }

    return html;
}

// Filter data
function filterOnClick(container, event, dataKey) {
    const clickedFilter = event.target;
    if (clickedFilter.classList.contains('filter')) {
        // Remove active class from all filters
        const filters = container.querySelectorAll('.filter');
        filters.forEach(filter => filter.classList.remove('active'));

        // Add active class to the clicked filter
        clickedFilter.classList.add('active');

        refreshIssueList(dataKey, clickedFilter.dataset[dataKey]);
    }
}

function getFilterContainerHtml(categoryCounts) {
    return `<div class="filter-type-container">
                <span class="filter-text">Type:</span>
                <span id="RULETYPE-ALL" class="filter active" data-filter-type="ALL">All</span>
                <span id="${RuleType.BUG.id}" class="filter" data-filter-type="${RuleType.BUG.id}">Bug (${categoryCounts[RuleType.BUG.id]})</span>
                <span id="${RuleType.VULNERABILITY.id}" class="filter" data-filter-type="${RuleType.VULNERABILITY.id}">Vulnerability (${categoryCounts[RuleType.VULNERABILITY.id]})</span>
                <span id="${RuleType.CODE_SMELL.id}" class="filter" data-filter-type="${RuleType.CODE_SMELL.id}">Code Smell (${categoryCounts[RuleType.CODE_SMELL.id]})</span>
            </div>
            <div class="filter-severity-container">
                <span class="filter-text">Severity:</span>
                <span id="SEVERITY-ALL" class="filter active" data-filter-severity="ALL">All</span>
                <span id="${IssueSeverity.BLOCKER.id}" class="filter" data-filter-severity="${IssueSeverity.BLOCKER.id}">Blocker (${categoryCounts[IssueSeverity.BLOCKER.id]})</span>
                <span id="${IssueSeverity.CRITICAL.id}" class="filter" data-filter-severity="${IssueSeverity.CRITICAL.id}">Critical (${categoryCounts[IssueSeverity.CRITICAL.id]})</span>
                <span id="${IssueSeverity.MAJOR.id}" class="filter" data-filter-severity="${IssueSeverity.MAJOR.id}">Major (${categoryCounts[IssueSeverity.MAJOR.id]})</span>
                <span id="${IssueSeverity.MINOR.id}" class="filter" data-filter-severity="${IssueSeverity.MINOR.id}">Minor (${categoryCounts[IssueSeverity.MINOR.id]})</span>
                <span id="${IssueSeverity.INFO.id}" class="filter" data-filter-severity="${IssueSeverity.INFO.id}">Info (${categoryCounts[IssueSeverity.INFO.id]})</span>
            </div>`
}

function getIconsForIssue(issue) {
    let ruleTypeIcon = {};
    switch (issue.ruleType) {
        case RuleType.BUG.id:
            ruleTypeIcon = {icon: 'bug', color: '#ed8c8c'};
            break;
        case RuleType.VULNERABILITY.id:
            ruleTypeIcon = {icon: 'unlock-alt', color: '#69caf5'};
            break;
        case RuleType.CODE_SMELL.id:
        default:
            ruleTypeIcon = {icon: 'code', color: '#61c96b'};
            break;
    }

    let severityIcon = {};
    switch (issue.issueSeverity) {
        case IssueSeverity.CRITICAL.id:
            severityIcon = {icon: 'arrow-circle-up', color: '#d02f3a'};
            break;
        case IssueSeverity.BLOCKER.id:
            severityIcon = {icon: 'exclamatio-circle', color: '#d02f3a'};
            break;
        case IssueSeverity.MAJOR.id:
            severityIcon = {icon: 'chevron-up', color: '#d02f3a'};
            break;
        case IssueSeverity.MINOR.id:
            severityIcon = {icon: 'arrow-circle-down', color: '#b0d513'};
            break;
        case IssueSeverity.INFO.id:
        default:
            severityIcon = {icon: 'info-circle', color: "#d02f3a"};
            break;
    }

    return {ruleTypeIcon: ruleTypeIcon, severityIcon: severityIcon}
}

// Constants
export const IssueSeverity = {
    INFO: {id: "INFO", name: "Info"},
    MINOR: {id: "MINOR", name: "Minor"},
    MAJOR: {id: "MAJOR", name: "Major"},
    CRITICAL: {id: "CRITICAL", name: "Critical"},
    BLOCKER: {id: "BLOCKER", name: "Blocker"}
}
  
export const RuleType = {
    CODE_SMELL: {id: "CODE_SMELL", name: "Code Smell"},
    BUG: {id: "BUG", name: "Bug"},
    VULNERABILITY: {id: "VULNERABILITY", name: "Vulnerability"},
    SECURITY_HOTSPOT: {id: "SECURITY_HOTSPOT", name: "Security Hotspot"}
}

// Refresh on first initiation
function init() {
    // Init counts
    let categoryCounts = {
        'SEVERITY-ALL': 0,
        'RULETYPE-ALL': 0,
        [RuleType.BUG.id]: 0,
        [RuleType.VULNERABILITY.id]: 0,
        [RuleType.CODE_SMELL.id]: 0,
        [IssueSeverity.BLOCKER.id]: 0,
        [IssueSeverity.CRITICAL.id]: 0,
        [IssueSeverity.MAJOR.id]: 0,
        [IssueSeverity.MINOR.id]: 0,
        [IssueSeverity.INFO.id]: 0
    };

    // Init filter containers and onclicks
    const filterDiv = document.getElementById('filter-container');
    filterDiv.innerHTML = getFilterContainerHtml(categoryCounts);
    const filterSeverityContainer = document.querySelector('.filter-severity-container');
    const filterTypeContainer = document.querySelector('.filter-type-container');

    filterSeverityContainer.addEventListener('click', (event) => {
        filterOnClick(filterSeverityContainer, event, 'filterSeverity');
    });
    filterTypeContainer.addEventListener('click', (event) => {
        filterOnClick(filterTypeContainer, event, 'filterType');
    });
    
    // Set counts
    recreateFilters(categoryCounts);

    // Get issues
    refreshIssueList();
}
init();