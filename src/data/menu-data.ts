/**
 * Shared menu data for UK site - English labels and UK URLs
 * Hardcoded for UK site to avoid fetching from German WordPress
 */

const iconBaseUrl = 'https://hercules-merchandising.fr/wp-content/uploads/hercules-menu-icons/';

export interface MenuItem {
  label: string;
  href: string;
  icon_url: string;
}

export interface MenuData {
  sportarten: MenuItem[];
  produkte: MenuItem[];
  themen: MenuItem[];
  directLinks: { label: string; href: string }[];
}

// UK English menu data
const ukMenuData: MenuData = {
  sportarten: [
    { label: 'Football', href: '/collections/football/', icon_url: iconBaseUrl + 'Football.svg' },
    { label: 'Rugby', href: '/collections/rugby/', icon_url: iconBaseUrl + 'Rugby-1.svg' },
    { label: 'Basketball', href: '/collections/basketball/', icon_url: iconBaseUrl + 'Basketball-1.svg' },
    { label: 'Running', href: '/collections/running/', icon_url: iconBaseUrl + 'running-1.svg' },
    { label: 'Field Hockey', href: '/collections/field-hockey/', icon_url: iconBaseUrl + 'field-hockey-1.svg' },
    { label: 'Volleyball', href: '/collections/volleyball/', icon_url: iconBaseUrl + 'volleyball-1.svg' },
    { label: 'Handball', href: '/collections/handball/', icon_url: iconBaseUrl + 'handball-1.svg' },
    { label: 'Cycling', href: '/collections/cycling/', icon_url: iconBaseUrl + 'cycling-1.svg' },
    { label: 'Fitness', href: '/collections/fitness/', icon_url: iconBaseUrl + 'fitness-1.svg' },
    { label: 'Golf', href: '/collections/golf/', icon_url: iconBaseUrl + 'golf-1.svg' },
    { label: 'eSports', href: '/collections/esports/', icon_url: iconBaseUrl + 'esport-1.svg' },
  ],
  produkte: [
    { label: 'Sportswear', href: '/collections/custom-printed-sportswear/', icon_url: iconBaseUrl + 'teamwear-1.svg' },
    { label: 'Scarves', href: '/collections/custom-scarves/', icon_url: iconBaseUrl + 'scarves-1.svg' },
    { label: 'Beanies', href: '/collections/custom-beanies/', icon_url: iconBaseUrl + 'beanies-3.svg' },
    { label: 'Headwear', href: '/collections/headwear/', icon_url: iconBaseUrl + 'cap-1.svg' },
    { label: 'Pennants', href: '/collections/custom-pennants/', icon_url: iconBaseUrl + 'pennants-3.svg' },
    { label: 'Towels', href: '/collections/towels/', icon_url: iconBaseUrl + 'towelst-1.svg' },
    { label: 'Flags', href: '/collections/flags/', icon_url: iconBaseUrl + 'flags-1.svg' },
    { label: 'Footwear', href: '/collections/footwear/', icon_url: iconBaseUrl + 'footwear-1.svg' },
    { label: 'Bags', href: '/collections/bags/', icon_url: iconBaseUrl + 'sportsbag-1.svg' },
    { label: 'Textiles', href: '/collections/custom-textile/', icon_url: iconBaseUrl + 'textile-1.svg' },
    { label: 'Drinkware', href: '/collections/drinkware/', icon_url: iconBaseUrl + 'drinkware-1.svg' },
    { label: 'Balls', href: '/collections/balls/', icon_url: iconBaseUrl + 'balls-1.svg' },
    { label: 'Accessories', href: '/collections/accessories/', icon_url: iconBaseUrl + 'accessories-1.svg' },
  ],
  themen: [
    { label: 'Summer', href: '/collections/summer/', icon_url: iconBaseUrl + 'summer-1.svg' },
    { label: 'Winter', href: '/collections/winter/', icon_url: iconBaseUrl + 'winter-1.svg' },
    { label: 'Sustainable', href: '/collections/sustainable/', icon_url: iconBaseUrl + 'sustainable-2.svg' },
    { label: 'Made in Europe', href: '/collections/made-in-europe/', icon_url: iconBaseUrl + 'made-in-europe-1.svg' },
    { label: 'Fashion', href: '/collections/fashion/', icon_url: iconBaseUrl + 'fashion-1.svg' },
    { label: 'Back to School', href: '/collections/back-to-school/', icon_url: iconBaseUrl + 'back-to-school-1.svg' },
    { label: 'Tifo', href: '/collections/tifo/', icon_url: iconBaseUrl + 'tifo-1.svg' },
    { label: 'Christmas', href: '/collections/christmas/', icon_url: iconBaseUrl + 'christmas-1.svg' },
    { label: 'Small Prices', href: '/collections/small-prices/', icon_url: iconBaseUrl + 'smallprices.svg' },
    { label: 'Business', href: '/collections/business/', icon_url: iconBaseUrl + 'business.svg' },
    { label: 'Giveaways', href: '/collections/give-aways/', icon_url: iconBaseUrl + 'giive-aways.svg' },
    { label: 'Kids', href: '/collections/kids/', icon_url: iconBaseUrl + 'kids.svg' },
  ],
  directLinks: [
    { label: 'Sportswear', href: '/collections/custom-printed-sportswear/' },
    { label: 'Scarves', href: '/collections/custom-scarves/' },
    { label: 'Headwear', href: '/collections/headwear/' },
    { label: 'Beanies', href: '/collections/custom-beanies/' },
  ],
};

export async function getMenuData(): Promise<MenuData> {
  // Return hardcoded UK English menu data
  return ukMenuData;
}
