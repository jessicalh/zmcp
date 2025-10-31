% Example: Using ZMCP CLI from MATLAB
% Fetch and analyze PDB structures

%% Example 1: Fetch PDB structure and load into MATLAB
pdbId = '4HHB';  % Hemoglobin

% Fetch PDB file using CLI
outputFile = 'hemoglobin.pdb';
[status, result] = system(sprintf('node ../dist/cli.js fetch-pdb %s --output %s --json', pdbId, outputFile));

if status == 0
    % Parse JSON result
    data = jsondecode(result);
    fprintf('✓ Fetched %s: %s\n', data.pdbId, data.title);
    fprintf('  Authors: %d\n', data.authors);
    fprintf('  Method: %s\n', data.method);
    fprintf('  File size: %d bytes\n', data.fileSize);

    % Now you can load the PDB file for analysis
    % pdbData = pdbread(outputFile);  % If you have Bioinformatics Toolbox
else
    error('Failed to fetch PDB: %s', result);
end

%% Example 2: Save PDB to Zotero for citation management
pdbId = '1MBN';  % Myoglobin

[status, result] = system(sprintf('node ../dist/cli.js save-pdb %s --collection "MATLAB Structures" --json', pdbId));

if status == 0
    data = jsondecode(result);
    fprintf('✓ Saved to Zotero: %s\n', data.itemKey);
    fprintf('  Collection: %s\n', data.collection);
    fprintf('  Has file: %d\n', data.hasFile);
    fprintf('  Has note: %d\n', data.hasNote);
else
    error('Failed to save PDB: %s', result);
end

%% Example 3: Search Zotero library from MATLAB
query = 'hemoglobin';

[status, result] = system(sprintf('node ../dist/cli.js search "%s" --json', query));

if status == 0
    items = jsondecode(result);
    fprintf('Found %d citations matching "%s"\n', length(items), query);

    for i = 1:length(items)
        fprintf('  %d. %s (%s)\n', i, items(i).title, items(i).key);
    end
else
    error('Search failed: %s', result);
end

%% Example 4: Download PDB file from Zotero
% First search for the structure
[status, result] = system('node ../dist/cli.js search "2HHB" --json');
items = jsondecode(result);

if ~isempty(items)
    itemKey = items(1).key;

    % Get attachment info
    [status, result] = system(sprintf('node ../dist/cli.js get %s --json', itemKey));
    data = jsondecode(result);

    % Find PDB attachment
    for i = 1:length(data.children)
        if strcmp(data.children(i).itemType, 'attachment') && ...
           contains(data.children(i).contentType, 'pdb')
            attachmentKey = data.children(i).key;

            % Download the PDB file
            outputFile = '2HHB-from-zotero.pdb';
            [status, result] = system(sprintf('node ../dist/cli.js download %s %s --json', ...
                attachmentKey, outputFile));

            if status == 0
                downloadData = jsondecode(result);
                fprintf('✓ Downloaded PDB: %s (%d bytes)\n', ...
                    outputFile, downloadData.size);
                fprintf('  MD5: %s\n', downloadData.md5);

                % Now analyze the structure in MATLAB
                % pdbData = pdbread(outputFile);
            end
            break;
        end
    end
end

%% Example 5: Batch process multiple structures
pdbIds = {'4HHB', '1MBN', '2HHB', '1UBQ'};

for i = 1:length(pdbIds)
    pdbId = pdbIds{i};
    outputFile = sprintf('%s.pdb', pdbId);

    % Fetch structure
    [status, result] = system(sprintf('node ../dist/cli.js fetch-pdb %s --output %s --json', ...
        pdbId, outputFile));

    if status == 0
        data = jsondecode(result);
        fprintf('✓ %s: %s (%d bytes)\n', data.pdbId, data.title, data.fileSize);

        % Process the structure
        % Your analysis code here

    else
        fprintf('✗ Failed to fetch %s\n', pdbId);
    end
end

fprintf('\n✓ All structures fetched and ready for analysis\n');
