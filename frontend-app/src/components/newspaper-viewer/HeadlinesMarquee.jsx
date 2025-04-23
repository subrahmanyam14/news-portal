import { useRef } from "react";

export default function HeadlinesMarquee({ headlines, loading }) {
	const marqueeRef = useRef(null);

	if (loading || !headlines.length) return null;

	return (
		<div className="marquee-container">
			<marquee
				ref={marqueeRef}
				behavior="scroll"
				direction="left"
				scrollAmount="5"
				onMouseOver={() => marqueeRef.current && marqueeRef.current.stop()}
				onMouseOut={() => marqueeRef.current && marqueeRef.current.start()}
			>
				{headlines.map((headline, index) => (
					<a
						key={index}
						href={headline.path}
						target="_blank"
						rel="noopener noreferrer"
						className="mr-6 hover:text-blue-500"
					>
						● {headline.name}
					</a>
				))}
			</marquee>
		</div>
	);
}