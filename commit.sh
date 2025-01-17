#!/bin/bash

current_branch=$(git branch --show-current)

merge_branch=$1

echo "Enter commit message:"
read message

first_element=$(echo "$current_branch" | cut -d'/' -f2)
issue_number=$(echo "$first_element" | cut -d'-' -f1)
echo "Prefix Number: $issue_number"
message="${message} #${issue_number}"

echo Current branch: $current_branch
echo Commit message: $message

# Run pnpm build
echo "Running pnpm build..."
if pnpm build; then
    echo "Build successful!"

    if [ "$merge_branch" = "" ]; then
        git add .
        git commit -m "$message"
        git pull origin $current_branch
        git push origin $current_branch
        echo Commit and push $current_branch success!
    else
        echo Merge branch: $merge_branch
        git add .
        git commit -m "$message"
        git pull origin $current_branch
        git checkout $merge_branch
        git pull origin $merge_branch
        git checkout $current_branch
        git merge $merge_branch
        git push origin $current_branch

        echo Merge $merge_branch to $current_branch success!
        echo Commit and push $current_branch success!
    fi
else
    echo "Build failed. Aborting commit and push."
fi