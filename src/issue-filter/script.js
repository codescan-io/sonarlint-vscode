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
            let issueIcon = getIconForSeverity(issue.issueSeverity);

            childrenHtml +=
                `<div class="issue-container" data-file-uri=${fileUri} data-line-number=${issue.range.start.line}>
                    <div class="icon"><i class="fa fa-${issueIcon.icon}" style="color:${issueIcon.color}; padding: 1dp"></i></div>
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
                <span class="filename-wrapper">
                    <i class="fa fa-chevron-down" style="font-size: 10px"></i>
                    ${fileInfo.fileName}
                    <span class="filepath-wrapper">${fileInfo.fileRelativePath}</span>
                </span>
                <div class="children">
                    ${childrenHtml}
                </div>
            </div>\n`
    }

    return html;
}

function getIconForSeverity(issueSeverity) {
    switch (issueSeverity) {
        case 'CRITICAL':
            return {icon: 'arrow-circle-up', color: '#d02f3a'};
        case 'BLOCKER':
            return {icon: 'exclamation', color: '#d02f3a'};
        case 'MAJOR':
            return {icon: 'chevron-up', color: '#d02f3a'};
        case 'MINOR':
            return {icon: 'arrow-circle-down', color: '#b0d513'};
        case 'INFO':
            return {icon: 'info-circle', color: '#4b9fd5'};
        default:
            return {icon: 'chevron-up', color: "#d02f3a"};
    }
}