const vscode = acquireVsCodeApi();

// Listen for issues
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'updateIssues':
            const issues = message.issues;
            const issuesDiv = document.getElementById('issues');
            issuesDiv.innerHTML = getIssueHtml(issues);
            recreateListeners();
            break;
    }
});

function refreshIssueList(filterKey = undefined, filterValue = undefined) {
    vscode.postMessage({ command: 'getIssues', filterKey: filterKey, filterValue: filterValue });
}

// Refresh on first initiation
refreshIssueList();

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
const filterSeverityContainer = document.querySelector('.filter-severity-container');
const filterTypeContainer = document.querySelector('.filter-type-container');

filterSeverityContainer.addEventListener('click', (event) => {
    filterOnClick(filterSeverityContainer, event, 'filterSeverity');
});
filterTypeContainer.addEventListener('click', (event) => {
    filterOnClick(filterTypeContainer, event, 'filterType');
});

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
                        <i class="fa fa-${icons.severityIcon.icon} fa-fw" style="color:${icons.severityIcon.color}; padding: 1dp;"></i>
                        <i class="fa fa-${icons.ruleTypeIcon.icon} fa-fw" style="color:${icons.ruleTypeIcon.color}; padding: 1dp;"></i>
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

function getIconsForIssue(issue) {
    let ruleTypeIcon = {};
    switch (issue.ruleType) {
        case 'BUG':
            ruleTypeIcon = {icon: 'bug', color: '#ed8c8c'};
            break;
        case 'VULNERABILITY':
            ruleTypeIcon = {icon: 'unlock-alt', color: '#69caf5'};
            break;
        case 'CODE_SMELL':
        default:
            ruleTypeIcon = {icon: 'code', color: '#61c96b'};
            break;
    }

    let severityIcon = {};
    switch (issue.issueSeverity) {
        case 'CRITICAL':
            severityIcon = {icon: 'arrow-circle-up', color: '#d02f3a'};
            break;
        case 'BLOCKER':
            severityIcon = {icon: 'exclamatio-circle', color: '#d02f3a'};
            break;
        case 'MAJOR':
            severityIcon = {icon: 'chevron-up', color: '#d02f3a'};
            break;
        case 'MINOR':
            severityIcon = {icon: 'arrow-circle-down', color: '#b0d513'};
            break;
        case 'INFO':
        default:
            severityIcon = {icon: 'info-circle', color: "#d02f3a"};
            break;
    }

    return {ruleTypeIcon: ruleTypeIcon, severityIcon: severityIcon}
}