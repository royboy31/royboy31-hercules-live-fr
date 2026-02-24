/**
 * Shared menu data for FR site - French labels and FR URLs
 */

const iconBaseUrl = '/images/menu/';

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

// FR French menu data
const frMenuData: MenuData = {
  sportarten: [
    { label: 'Football', href: '/collections/football/', icon_url: iconBaseUrl + 'Football.svg' },
    { label: 'Rugby', href: '/collections/rugby/', icon_url: iconBaseUrl + 'Rugby-1.svg' },
    { label: 'Basket-ball', href: '/collections/basketball/', icon_url: iconBaseUrl + 'Basketball-1.svg' },
    { label: 'Running', href: '/collections/running/', icon_url: iconBaseUrl + 'running-1.svg' },
    { label: 'Hockey sur gazon', href: '/collections/hockey-sur-gazon/', icon_url: iconBaseUrl + 'field-hockey-1.svg' },
    { label: 'Volleyball', href: '/collections/volleyball/', icon_url: iconBaseUrl + 'volleyball-1.svg' },
    { label: 'Handball', href: '/collections/handball/', icon_url: iconBaseUrl + 'handball-1.svg' },
    { label: 'Cyclisme', href: '/collections/cyclisme/', icon_url: iconBaseUrl + 'cycling-1.svg' },
    { label: 'Fitness', href: '/collections/fitness/', icon_url: iconBaseUrl + 'fitness-1.svg' },
    { label: 'Golf', href: '/collections/golf/', icon_url: iconBaseUrl + 'golf-1.svg' },
    { label: 'eSports', href: '/collections/esports/', icon_url: iconBaseUrl + 'esport-1.svg' },
  ],
  produkte: [
    { label: 'Vêtements de sport', href: '/collections/equipements-personnalises/', icon_url: iconBaseUrl + 'teamwear-1.svg' },
    { label: 'Écharpes', href: '/collections/echarpes-personnalisees/', icon_url: iconBaseUrl + 'scarves-1.svg' },
    { label: 'Bonnets', href: '/collections/bonnets-personnalises-football/', icon_url: iconBaseUrl + 'beanies-3.svg' },
    { label: 'Couvre-chefs', href: '/collections/couvre-chefs/', icon_url: iconBaseUrl + 'cap-1.svg' },
    { label: 'Fanions', href: '/collections/fanions-personnalises-football/', icon_url: iconBaseUrl + 'pennants-3.svg' },
    { label: 'Serviettes', href: '/collections/serviettes-personnalisees/', icon_url: iconBaseUrl + 'towelst-1.svg' },
    { label: 'Drapeaux', href: '/collections/drapeaux-personnalises/', icon_url: iconBaseUrl + 'flags-1.svg' },
    { label: 'Chaussettes et claquettes', href: '/collections/chaussettes-et-claquettes/', icon_url: iconBaseUrl + 'footwear-1.svg' },
    { label: 'Sacs', href: '/collections/sacs-de-sport-personnalises/', icon_url: iconBaseUrl + 'sportsbag-1.svg' },
    { label: 'Textile', href: '/collections/textile-sport-personnalise/', icon_url: iconBaseUrl + 'textile-1.svg' },
    { label: 'Bidons & tasses', href: '/collections/bidons-et-tasses/', icon_url: iconBaseUrl + 'drinkware-1.svg' },
    { label: 'Ballons', href: '/collections/ballons/', icon_url: iconBaseUrl + 'balls-1.svg' },
    { label: 'Accessoires', href: '/collections/accessoires-de-football/', icon_url: iconBaseUrl + 'accessories-1.svg' },
  ],
  themen: [
    { label: 'Été', href: '/collections/ete/', icon_url: iconBaseUrl + 'summer-1.svg' },
    { label: 'Hiver', href: '/collections/hiver/', icon_url: iconBaseUrl + 'winter-1.svg' },
    { label: 'Durable', href: '/collections/durable/', icon_url: iconBaseUrl + 'sustainable-2.svg' },
    { label: 'Fabriqué en Europe', href: '/collections/fabrique-en-europe/', icon_url: iconBaseUrl + 'made-in-europe-1.svg' },
    { label: 'Mode', href: '/collections/mode/', icon_url: iconBaseUrl + 'fashion-1.svg' },
    { label: 'Rentrée scolaire', href: '/collections/rentree-scolaire/', icon_url: iconBaseUrl + 'back-to-school-1.svg' },
    { label: 'Tifo', href: '/collections/tifo/', icon_url: iconBaseUrl + 'tifo-1.svg' },
    { label: 'Noël', href: '/collections/noel/', icon_url: iconBaseUrl + 'christmas-1.svg' },
    { label: 'Petits prix', href: '/collections/petits-prix/', icon_url: iconBaseUrl + 'smallprices.svg' },
    { label: 'Business', href: '/collections/business/', icon_url: iconBaseUrl + 'business.svg' },
    { label: 'Cadeaux', href: '/collections/cadeaux/', icon_url: iconBaseUrl + 'giive-aways.svg' },
    { label: 'Enfants', href: '/collections/enfants/', icon_url: iconBaseUrl + 'kids.svg' },
  ],
  directLinks: [
    { label: 'Vêtements de sport', href: '/collections/equipements-personnalises/' },
    { label: 'Écharpes', href: '/collections/echarpes-personnalisees/' },
    { label: 'Couvre-chefs', href: '/collections/couvre-chefs/' },
    { label: 'Bonnets', href: '/collections/bonnets-personnalises-football/' },
  ],
};

export async function getMenuData(): Promise<MenuData> {
  return frMenuData;
}
