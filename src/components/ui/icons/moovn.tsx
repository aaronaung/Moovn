"use client";
import { useTheme } from "next-themes";

export const MoovnLogo = ({
  className,
  width = 64,
  height = 64,
}: {
  className?: any;
  width?: number;
  height?: number;
}) => {
  const { resolvedTheme } = useTheme();

  if (!resolvedTheme) {
    return (
      <div
        style={{
          width,
          height,
        }}
      ></div>
    );
  }

  if (resolvedTheme === "dark") {
    return (
      <svg
        id={resolvedTheme}
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        width={width}
        height={height}
        className={className}
        viewBox="0 0 2000 409"
      >
        <g transform="matrix(1,0,0,1,-1.2121212121213603,0.5996403872752012)">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 396 81"
            data-background-color="#ffffff"
            preserveAspectRatio="xMidYMid meet"
            height="409"
            width="2000"
          >
            <g
              id="tight-bounds"
              transform="matrix(1,0,0,1,0.24000000000003752,-0.11875518672198382)"
            >
              <svg
                viewBox="0 0 395.5199999999999 81.23751037344397"
                height="81.23751037344397"
                width="395.5199999999999"
              >
                <g>
                  <svg
                    viewBox="0 0 395.52000000000004 81.23751037344398"
                    height="81.23751037344397"
                    width="395.5199999999999"
                  >
                    <g>
                      <svg
                        viewBox="0 0 395.52000000000004 81.23751037344398"
                        height="81.23751037344398"
                        width="395.52000000000004"
                      >
                        <g id="textblocktransform">
                          <svg
                            viewBox="0 0 395.52000000000004 81.23751037344398"
                            height="81.23751037344398"
                            width="395.52000000000004"
                            id="textblock"
                          >
                            <g>
                              <svg
                                viewBox="0 0 395.52000000000004 81.23751037344398"
                                height="81.23751037344398"
                                width="395.52000000000004"
                              >
                                <g transform="matrix(1,0,0,1,0,0)">
                                  <svg
                                    width="395.52000000000004"
                                    viewBox="3 -35.5 176.51 36.26"
                                    height="81.23751037344398"
                                    data-palette-color="#16171b"
                                  >
                                    <path
                                      d="M37.99-25L37.99 0 31.01 0 31.01-25Q31.01-25.73 30.73-26.37 30.44-27 29.97-27.48 29.49-27.95 28.86-28.22 28.22-28.49 27.49-28.49L27.49-28.49Q26.76-28.49 26.12-28.22 25.49-27.95 25.01-27.48 24.54-27 24.27-26.37 24-25.73 24-25L24-25 24 0 16.99 0 16.99-25Q16.99-25.73 16.72-26.37 16.46-27 15.98-27.48 15.5-27.95 14.87-28.22 14.23-28.49 13.5-28.49L13.5-28.49Q12.77-28.49 12.13-28.22 11.5-27.95 11.02-27.48 10.55-27 10.28-26.37 10.01-25.73 10.01-25L10.01-25 10.01 0 3 0 3-25Q3-27.17 3.82-29.09 4.64-31.01 6.07-32.43 7.5-33.86 9.41-34.68 11.33-35.5 13.5-35.5L13.5-35.5Q15.45-35.5 17.26-34.8 19.07-34.11 20.51-32.79L20.51-32.79Q21.95-34.11 23.74-34.8 25.54-35.5 27.49-35.5L27.49-35.5Q29.66-35.5 31.58-34.68 33.5-33.86 34.92-32.43 36.35-31.01 37.17-29.09 37.99-27.17 37.99-25L37.99-25ZM78.54-17.36L78.54-17.36Q78.54-14.87 77.89-12.56 77.24-10.25 76.07-8.24 74.9-6.23 73.24-4.57 71.58-2.91 69.58-1.72 67.58-0.54 65.26 0.11 62.94 0.76 60.45 0.76L60.45 0.76Q57.96 0.76 55.65 0.11 53.34-0.54 51.33-1.72 49.31-2.91 47.65-4.57 45.99-6.23 44.81-8.24 43.63-10.25 42.98-12.56 42.33-14.87 42.33-17.36L42.33-17.36Q42.33-19.85 42.98-22.17 43.63-24.49 44.81-26.49 45.99-28.49 47.65-30.15 49.31-31.81 51.33-32.98 53.34-34.16 55.65-34.8 57.96-35.45 60.45-35.45L60.45-35.45Q62.94-35.45 65.26-34.8 67.58-34.16 69.58-32.98 71.58-31.81 73.24-30.15 74.9-28.49 76.07-26.49 77.24-24.49 77.89-22.17 78.54-19.85 78.54-17.36ZM71.58-17.36L71.58-17.36Q71.58-19.65 70.7-21.69 69.82-23.73 68.32-25.23 66.82-26.73 64.78-27.61 62.74-28.49 60.45-28.49L60.45-28.49Q58.13-28.49 56.1-27.61 54.07-26.73 52.56-25.23 51.05-23.73 50.17-21.69 49.29-19.65 49.29-17.36L49.29-17.36Q49.29-15.06 50.17-13.05 51.05-11.04 52.56-9.52 54.07-8.01 56.1-7.13 58.13-6.25 60.45-6.25L60.45-6.25Q62.74-6.25 64.78-7.13 66.82-8.01 68.32-9.52 69.82-11.04 70.7-13.05 71.58-15.06 71.58-17.36ZM117.43-17.36L117.43-17.36Q117.43-14.87 116.78-12.56 116.13-10.25 114.96-8.24 113.79-6.23 112.13-4.57 110.47-2.91 108.47-1.72 106.46-0.54 104.15 0.11 101.83 0.76 99.34 0.76L99.34 0.76Q96.85 0.76 94.54 0.11 92.23-0.54 90.22-1.72 88.2-2.91 86.54-4.57 84.88-6.23 83.7-8.24 82.51-10.25 81.87-12.56 81.22-14.87 81.22-17.36L81.22-17.36Q81.22-19.85 81.87-22.17 82.51-24.49 83.7-26.49 84.88-28.49 86.54-30.15 88.2-31.81 90.22-32.98 92.23-34.16 94.54-34.8 96.85-35.45 99.34-35.45L99.34-35.45Q101.83-35.45 104.15-34.8 106.46-34.16 108.47-32.98 110.47-31.81 112.13-30.15 113.79-28.49 114.96-26.49 116.13-24.49 116.78-22.17 117.43-19.85 117.43-17.36ZM110.47-17.36L110.47-17.36Q110.47-19.65 109.59-21.69 108.71-23.73 107.21-25.23 105.71-26.73 103.67-27.61 101.63-28.49 99.34-28.49L99.34-28.49Q97.02-28.49 94.99-27.61 92.96-26.73 91.45-25.23 89.94-23.73 89.06-21.69 88.18-19.65 88.18-17.36L88.18-17.36Q88.18-15.06 89.06-13.05 89.94-11.04 91.45-9.52 92.96-8.01 94.99-7.13 97.02-6.25 99.34-6.25L99.34-6.25Q101.63-6.25 103.67-7.13 105.71-8.01 107.21-9.52 108.71-11.04 109.59-13.05 110.47-15.06 110.47-17.36ZM140.15-35.01L148.16-35.01 136.66 0 129.66 0 118.21-35.01 126.16-35.01 133.15-11.65 140.15-35.01ZM179.51-35.01L179.51 0 172.01 0 158.51-23.05 158.51 0 151.5 0 151.5-35.01 159-35.01 172.5-11.94 172.5-35.01 179.51-35.01Z"
                                      opacity="1"
                                      transform="matrix(1,0,0,1,0,0)"
                                      fill="#ffffff"
                                      data-fill-palette-color="primary"
                                      id="text-0"
                                    />
                                  </svg>
                                </g>
                              </svg>
                            </g>
                          </svg>
                        </g>
                      </svg>
                    </g>
                  </svg>
                </g>
                <defs />
              </svg>
              <rect
                width="395.5199999999999"
                height="81.23751037344397"
                fill="none"
                stroke="none"
                visibility="hidden"
              />
            </g>
          </svg>
        </g>
      </svg>
    );
  }
  return (
    <svg
      id={resolvedTheme}
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      width={width}
      height={height}
      viewBox="0 0 2000 409"
      className={className}
    >
      <g transform="matrix(1,0,0,1,-1.2121212121213603,0.5996403872752012)">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 396 81"
          data-background-color="#ffffff"
          preserveAspectRatio="xMidYMid meet"
          height="409"
          width="2000"
        >
          <g id="tight-bounds" transform="matrix(1,0,0,1,0.24000000000003752,-0.11875518672198382)">
            <svg
              viewBox="0 0 395.5199999999999 81.23751037344397"
              height="81.23751037344397"
              width="395.5199999999999"
            >
              <g>
                <svg
                  viewBox="0 0 395.52000000000004 81.23751037344398"
                  height="81.23751037344397"
                  width="395.5199999999999"
                >
                  <g>
                    <svg
                      viewBox="0 0 395.52000000000004 81.23751037344398"
                      height="81.23751037344398"
                      width="395.52000000000004"
                    >
                      <g id="textblocktransform">
                        <svg
                          viewBox="0 0 395.52000000000004 81.23751037344398"
                          height="81.23751037344398"
                          width="395.52000000000004"
                          id="textblock"
                        >
                          <g>
                            <svg
                              viewBox="0 0 395.52000000000004 81.23751037344398"
                              height="81.23751037344398"
                              width="395.52000000000004"
                            >
                              <g transform="matrix(1,0,0,1,0,0)">
                                <svg
                                  width="395.52000000000004"
                                  viewBox="3 -35.5 176.51 36.26"
                                  height="81.23751037344398"
                                  data-palette-color="#16171b"
                                >
                                  <path
                                    d="M37.99-25L37.99 0 31.01 0 31.01-25Q31.01-25.73 30.73-26.37 30.44-27 29.97-27.48 29.49-27.95 28.86-28.22 28.22-28.49 27.49-28.49L27.49-28.49Q26.76-28.49 26.12-28.22 25.49-27.95 25.01-27.48 24.54-27 24.27-26.37 24-25.73 24-25L24-25 24 0 16.99 0 16.99-25Q16.99-25.73 16.72-26.37 16.46-27 15.98-27.48 15.5-27.95 14.87-28.22 14.23-28.49 13.5-28.49L13.5-28.49Q12.77-28.49 12.13-28.22 11.5-27.95 11.02-27.48 10.55-27 10.28-26.37 10.01-25.73 10.01-25L10.01-25 10.01 0 3 0 3-25Q3-27.17 3.82-29.09 4.64-31.01 6.07-32.43 7.5-33.86 9.41-34.68 11.33-35.5 13.5-35.5L13.5-35.5Q15.45-35.5 17.26-34.8 19.07-34.11 20.51-32.79L20.51-32.79Q21.95-34.11 23.74-34.8 25.54-35.5 27.49-35.5L27.49-35.5Q29.66-35.5 31.58-34.68 33.5-33.86 34.92-32.43 36.35-31.01 37.17-29.09 37.99-27.17 37.99-25L37.99-25ZM78.54-17.36L78.54-17.36Q78.54-14.87 77.89-12.56 77.24-10.25 76.07-8.24 74.9-6.23 73.24-4.57 71.58-2.91 69.58-1.72 67.58-0.54 65.26 0.11 62.94 0.76 60.45 0.76L60.45 0.76Q57.96 0.76 55.65 0.11 53.34-0.54 51.33-1.72 49.31-2.91 47.65-4.57 45.99-6.23 44.81-8.24 43.63-10.25 42.98-12.56 42.33-14.87 42.33-17.36L42.33-17.36Q42.33-19.85 42.98-22.17 43.63-24.49 44.81-26.49 45.99-28.49 47.65-30.15 49.31-31.81 51.33-32.98 53.34-34.16 55.65-34.8 57.96-35.45 60.45-35.45L60.45-35.45Q62.94-35.45 65.26-34.8 67.58-34.16 69.58-32.98 71.58-31.81 73.24-30.15 74.9-28.49 76.07-26.49 77.24-24.49 77.89-22.17 78.54-19.85 78.54-17.36ZM71.58-17.36L71.58-17.36Q71.58-19.65 70.7-21.69 69.82-23.73 68.32-25.23 66.82-26.73 64.78-27.61 62.74-28.49 60.45-28.49L60.45-28.49Q58.13-28.49 56.1-27.61 54.07-26.73 52.56-25.23 51.05-23.73 50.17-21.69 49.29-19.65 49.29-17.36L49.29-17.36Q49.29-15.06 50.17-13.05 51.05-11.04 52.56-9.52 54.07-8.01 56.1-7.13 58.13-6.25 60.45-6.25L60.45-6.25Q62.74-6.25 64.78-7.13 66.82-8.01 68.32-9.52 69.82-11.04 70.7-13.05 71.58-15.06 71.58-17.36ZM117.43-17.36L117.43-17.36Q117.43-14.87 116.78-12.56 116.13-10.25 114.96-8.24 113.79-6.23 112.13-4.57 110.47-2.91 108.47-1.72 106.46-0.54 104.15 0.11 101.83 0.76 99.34 0.76L99.34 0.76Q96.85 0.76 94.54 0.11 92.23-0.54 90.22-1.72 88.2-2.91 86.54-4.57 84.88-6.23 83.7-8.24 82.51-10.25 81.87-12.56 81.22-14.87 81.22-17.36L81.22-17.36Q81.22-19.85 81.87-22.17 82.51-24.49 83.7-26.49 84.88-28.49 86.54-30.15 88.2-31.81 90.22-32.98 92.23-34.16 94.54-34.8 96.85-35.45 99.34-35.45L99.34-35.45Q101.83-35.45 104.15-34.8 106.46-34.16 108.47-32.98 110.47-31.81 112.13-30.15 113.79-28.49 114.96-26.49 116.13-24.49 116.78-22.17 117.43-19.85 117.43-17.36ZM110.47-17.36L110.47-17.36Q110.47-19.65 109.59-21.69 108.71-23.73 107.21-25.23 105.71-26.73 103.67-27.61 101.63-28.49 99.34-28.49L99.34-28.49Q97.02-28.49 94.99-27.61 92.96-26.73 91.45-25.23 89.94-23.73 89.06-21.69 88.18-19.65 88.18-17.36L88.18-17.36Q88.18-15.06 89.06-13.05 89.94-11.04 91.45-9.52 92.96-8.01 94.99-7.13 97.02-6.25 99.34-6.25L99.34-6.25Q101.63-6.25 103.67-7.13 105.71-8.01 107.21-9.52 108.71-11.04 109.59-13.05 110.47-15.06 110.47-17.36ZM140.15-35.01L148.16-35.01 136.66 0 129.66 0 118.21-35.01 126.16-35.01 133.15-11.65 140.15-35.01ZM179.51-35.01L179.51 0 172.01 0 158.51-23.05 158.51 0 151.5 0 151.5-35.01 159-35.01 172.5-11.94 172.5-35.01 179.51-35.01Z"
                                    opacity="1"
                                    transform="matrix(1,0,0,1,0,0)"
                                    fill="#16171b"
                                    data-fill-palette-color="primary"
                                    id="text-0"
                                  />
                                </svg>
                              </g>
                            </svg>
                          </g>
                        </svg>
                      </g>
                    </svg>
                  </g>
                </svg>
              </g>
              <defs />
            </svg>
            <rect
              width="395.5199999999999"
              height="81.23751037344397"
              fill="none"
              stroke="none"
              visibility="hidden"
            />
          </g>
        </svg>
      </g>
    </svg>
  );
};

export const MoovnIcon2 = ({
  className,
  width = 64,
  height = 64,
}: {
  className?: any;
  width?: number;
  height?: number;
}) => {
  const { resolvedTheme } = useTheme();

  if (!resolvedTheme) {
    return (
      <div
        style={{
          width,
          height,
        }}
      ></div>
    );
  }

  if (resolvedTheme === "dark") {
    return (
      <svg
        id={resolvedTheme}
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        width={width}
        height={height}
        className={className}
        viewBox="0 -35.5 40 35.5"
      >
        <path
          d="M37.99-25L37.99 0 31.01 0 31.01-25Q31.01-25.73 30.73-26.37 30.44-27 29.97-27.48 29.49-27.95 28.86-28.22 28.22-28.49 27.49-28.49L27.49-28.49Q26.76-28.49 26.12-28.22 25.49-27.95 25.01-27.48 24.54-27 24.27-26.37 24-25.73 24-25L24-25 24 0 16.99 0 16.99-25Q16.99-25.73 16.72-26.37 16.46-27 15.98-27.48 15.5-27.95 14.87-28.22 14.23-28.49 13.5-28.49L13.5-28.49Q12.77-28.49 12.13-28.22 11.5-27.95 11.02-27.48 10.55-27 10.28-26.37 10.01-25.73 10.01-25L10.01-25 10.01 0 3 0 3-25Q3-27.17 3.82-29.09 4.64-31.01 6.07-32.43 7.5-33.86 9.41-34.68 11.33-35.5 13.5-35.5L13.5-35.5Q15.45-35.5 17.26-34.8 19.07-34.11 20.51-32.79L20.51-32.79Q21.95-34.11 23.74-34.8 25.54-35.5 27.49-35.5L27.49-35.5Q29.66-35.5 31.58-34.68 33.5-33.86 34.92-32.43 36.35-31.01 37.17-29.09 37.99-27.17 37.99-25L37.99-25Z"
          fill="#ffffff"
        />
      </svg>
    );
  }

  return (
    <svg
      id={resolvedTheme}
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      width={width}
      height={height}
      className={className}
      viewBox="0 -35.5 40 35.5"
    >
      <path
        d="M37.99-25L37.99 0 31.01 0 31.01-25Q31.01-25.73 30.73-26.37 30.44-27 29.97-27.48 29.49-27.95 28.86-28.22 28.22-28.49 27.49-28.49L27.49-28.49Q26.76-28.49 26.12-28.22 25.49-27.95 25.01-27.48 24.54-27 24.27-26.37 24-25.73 24-25L24-25 24 0 16.99 0 16.99-25Q16.99-25.73 16.72-26.37 16.46-27 15.98-27.48 15.5-27.95 14.87-28.22 14.23-28.49 13.5-28.49L13.5-28.49Q12.77-28.49 12.13-28.22 11.5-27.95 11.02-27.48 10.55-27 10.28-26.37 10.01-25.73 10.01-25L10.01-25 10.01 0 3 0 3-25Q3-27.17 3.82-29.09 4.64-31.01 6.07-32.43 7.5-33.86 9.41-34.68 11.33-35.5 13.5-35.5L13.5-35.5Q15.45-35.5 17.26-34.8 19.07-34.11 20.51-32.79L20.51-32.79Q21.95-34.11 23.74-34.8 25.54-35.5 27.49-35.5L27.49-35.5Q29.66-35.5 31.58-34.68 33.5-33.86 34.92-32.43 36.35-31.01 37.17-29.09 37.99-27.17 37.99-25L37.99-25Z"
        fill="#16171b"
      />
    </svg>
  );
};
