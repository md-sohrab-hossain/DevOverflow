import { Code } from 'bright'; // https://www.npmjs.com/package/bright/v/0.5.4
import { MDXRemote } from 'next-mdx-remote/rsc'; // https://www.npmjs.com/package/next-mdx-remote

// Configure Bright Code syntax highlighting themes
Code.theme = {
  light: 'github-light', // Light mode theme
  dark: 'github-dark', // Dark mode theme
  lightSelector: 'html.light', // CSS selector for light mode
};

/**
 * Preview component for rendering MDX content with syntax highlighting
 * @param content - Markdown/MDX content to be rendered
 */
export const Preview = ({ content }: { content: string }) => {
  // Clean up content by removing escape characters and encoded spaces
  const formattedContent = content
    .replace(/\\/g, '') // Remove backslash escape characters
    .replace(/&#x20;/g, ''); // Remove encoded space characters

  return (
    // Markdown rendering section with responsive styling
    <section className="markdown prose grid break-words">
      <MDXRemote
        source={formattedContent}
        components={{
          // Custom pre tag rendering with Bright Code for syntax highlighting
          pre: props => (
            <Code
              {...props}
              lineNumbers // Enable line numbers
              className="shadow-light-200 dark:shadow-dark-200" // Add shadow for visual depth
            />
          ),
        }}
      />
    </section>
  );
};
